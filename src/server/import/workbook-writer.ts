import { AuditAction, EntryStatus, FundingSource, RevenueKind } from '@/generated/prisma/enums';
import { AUDIT_ENTITY } from '@/lib/constants';
import { Decimal } from '@/lib/decimal';
import { dateInMonth } from '@/lib/month';
import { computeRevenueLine } from '@/server/domain/revenue-math';
import {
  invoiceStatusFrom,
  normalizeName,
  pnlLineForSection,
  projectStatusFrom,
  splitClientAndPlatform,
} from '@/server/import/workbook-mapping';
import type {
  ParsedExpenseLine,
  ParsedMonth,
  ParsedRevenueLine,
} from '@/server/import/workbook-parser';
import { auditedChange, auditedCreate } from '@/server/repositories/audited-write';
import { type ClientRecord, clientRepository } from '@/server/repositories/client.repository';
import { runInTransaction } from '@/server/repositories/db';
import { expenseRepository } from '@/server/repositories/expense.repository';
import type { PlatformRecord } from '@/server/repositories/platform.repository';
import type { PartnerRecord } from '@/server/repositories/profit-sharing.repository';
import { revenueRepository } from '@/server/repositories/revenue.repository';
import {
  type ExpenseCategoryRecord,
  exchangeRateRepository,
  expenseCategoryRepository,
} from '@/server/repositories/settings.repository';
import type { SessionUser } from '@/types/auth';

const FIRST_DAY = 1;
const LAST_DAY = 31;

/** Reference data shared across the months of one import; new clients/categories are appended. */
export type ImportLookups = {
  receivedAccountId: string;
  currencies: { reporting: string; display: string };
  clients: ClientRecord[];
  categories: ExpenseCategoryRecord[];
  partners: PartnerRecord[];
  platforms: PlatformRecord[];
};

function byName<TRecord extends { name: string }>(
  records: readonly TRecord[],
  name: string,
): TRecord | undefined {
  return records.find((record) => normalizeName(record.name) === normalizeName(name));
}

async function clientFor(
  actor: SessionUser,
  name: string,
  platformId: string | null,
  lookups: ImportLookups,
) {
  const existing = byName(lookups.clients, name);
  if (existing) return existing;
  const created = await auditedCreate(actor.id, AUDIT_ENTITY.CLIENT, () =>
    clientRepository.create({
      name,
      defaultPlatformId: platformId,
      defaultFeePercent: null,
      active: true,
    }),
  );
  lookups.clients.push(created);
  return created;
}

async function categoryFor(actor: SessionUser, section: string, lookups: ImportLookups) {
  const existing = byName(lookups.categories, section);
  if (existing) return existing;
  const sortOrder = await expenseCategoryRepository.nextSortOrder();
  const created = await auditedCreate(actor.id, AUDIT_ENTITY.EXPENSE_CATEGORY, () =>
    expenseCategoryRepository.create({
      name: section,
      pnlLine: pnlLineForSection(section),
      sortOrder,
      active: true,
    }),
  );
  lookups.categories.push(created);
  return created;
}

async function writeRevenueLine(
  actor: SessionUser,
  month: ParsedMonth,
  line: ParsedRevenueLine,
  lookups: ImportLookups,
) {
  const names = splitClientAndPlatform(
    line,
    lookups.platforms.map((platform) => platform.name),
  );
  const platform = names.platformName ? byName(lookups.platforms, names.platformName) : undefined;
  const client = await clientFor(actor, names.clientName, platform?.id ?? null, lookups);
  const entry = await auditedCreate(actor.id, AUDIT_ENTITY.REVENUE_ENTRY, () =>
    revenueRepository.create(
      {
        kind: RevenueKind.BOOKED,
        status: EntryStatus.CONFIRMED,
        clientId: client.id,
        projectId: null,
        platformId: platform?.id ?? null,
        bookingMonth: month.month,
        description: null,
        gross: String(line.gross),
        feePercent: String(line.feePercent),
        projectStatus: projectStatusFrom(line.projectStatus),
        invoiceStatus: invoiceStatusFrom(line.invoiceStatus),
        referredBy: line.referredBy,
        closedByTeamMemberId: null,
        expectedDate: null,
        notes: `Imported from workbook tab "${month.tab}", row ${line.row}.`,
      },
      actor.id,
    ),
  );
  const net = computeRevenueLine({
    gross: entry.gross,
    feePercent: entry.feePercent,
    receipts: [],
    adjustments: [],
  }).net;
  const received = Decimal.min(new Decimal(line.received), net);
  if (received.greaterThan(0)) {
    await auditedCreate(actor.id, AUDIT_ENTITY.RECEIPT, () =>
      revenueRepository.createReceipt({
        revenueEntryId: entry.id,
        receivedOn: dateInMonth(month.month, LAST_DAY),
        amount: received.toFixed(2),
        accountId: lookups.receivedAccountId,
        isEscrow: false,
        createdById: actor.id,
      }),
    );
  }
}

async function writeExpenseLine(
  actor: SessionUser,
  month: ParsedMonth,
  line: ParsedExpenseLine,
  lookups: ImportLookups,
) {
  const category = await categoryFor(actor, line.section, lookups);
  const partner = line.fundingPartnerName
    ? byName(lookups.partners, line.fundingPartnerName)
    : undefined;
  await auditedCreate(actor.id, AUDIT_ENTITY.EXPENSE, () =>
    expenseRepository.create(
      {
        status: EntryStatus.CONFIRMED,
        expenseDate: dateInMonth(month.month, FIRST_DAY),
        categoryId: category.id,
        item: line.item,
        payeeTeamMemberId: null,
        amount: String(line.amount),
        currency: line.inReportingCurrency
          ? lookups.currencies.reporting
          : lookups.currencies.display,
        fundingSource: partner ? FundingSource.EXTERNAL : FundingSource.COMPANY,
        fundingPartnerId: partner?.id ?? null,
        paidFromAccountId: null,
        recurringTemplateId: null,
        notes: line.note,
      },
      actor.id,
    ),
  );
}

/** Writes one month tab in a single transaction: its rate, revenue (with receipts) and expenses. */
export async function importMonth(actor: SessionUser, month: ParsedMonth, lookups: ImportLookups) {
  await runInTransaction(async () => {
    if (month.rate !== null) {
      const rate = String(month.rate);
      await auditedChange(actor.id, {
        action: AuditAction.UPDATE,
        entityType: AUDIT_ENTITY.EXCHANGE_RATE,
        entityId: month.month,
        loadBefore: () => exchangeRateRepository.findByMonth(month.month),
        apply: () => exchangeRateRepository.upsert(month.month, rate),
      });
    }
    for (const line of month.revenue) await writeRevenueLine(actor, month, line, lookups);
    for (const line of month.expenses) await writeExpenseLine(actor, month, line, lookups);
  });
  return { revenueLines: month.revenue.length, expenseLines: month.expenses.length };
}
