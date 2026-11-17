import {
  EntryStatus,
  type ExpenseKind,
  type FundingSource,
  PnlLine,
  type SalesChannel,
} from '@/generated/prisma/enums';
import type { Prisma } from '@/generated/prisma/client';
import type { DecimalString } from '@/lib/decimal';
import { type MonthKey, isoDateToDate, monthDateRange, monthOfIsoDate } from '@/lib/month';
import { db } from '@/server/repositories/db';
import { dateToIsoDate, dateToMonthKey, monthKeyToDbDate } from '@/server/repositories/mappers';
import type { ExpenseRecord } from '@/types/expense';

export type ExpenseData = {
  /** Defaults to a hand-entered expense; set for BD commission and transfer fees. */
  kind?: ExpenseKind;
  transferId?: string | null;
  status: EntryStatus;
  expenseDate: string;
  paidOn: string | null;
  categoryId: string;
  item: string;
  payeeTeamMemberId: string | null;
  amount: DecimalString;
  currency: string;
  fundingSource: FundingSource;
  fundingPartnerId: string | null;
  paidFromAccountId: string | null;
  recurringTemplateId: string | null;
  salesChannel: SalesChannel | null;
  notes: string | null;
};

const EXPENSE_INCLUDE = {
  category: { select: { name: true } },
  payee: { select: { name: true } },
  fundingPartner: { select: { name: true } },
  paidFromAccount: { select: { name: true } },
} as const satisfies Prisma.ExpenseInclude;

type ExpenseRow = Prisma.ExpenseGetPayload<{ include: typeof EXPENSE_INCLUDE }>;

function toRecord(row: ExpenseRow): ExpenseRecord {
  return {
    id: row.id,
    status: row.status,
    expenseDate: dateToIsoDate(row.expenseDate),
    paidOn: row.paidOn ? dateToIsoDate(row.paidOn) : null,
    month: dateToMonthKey(row.month),
    categoryId: row.categoryId,
    categoryName: row.category.name,
    item: row.item,
    payeeTeamMemberId: row.payeeTeamMemberId,
    payeeName: row.payee?.name ?? null,
    amount: row.amount.toString(),
    currency: row.currency,
    fundingSource: row.fundingSource,
    fundingPartnerId: row.fundingPartnerId,
    fundingPartnerName: row.fundingPartner?.name ?? null,
    paidFromAccountId: row.paidFromAccountId,
    paidFromAccountName: row.paidFromAccount?.name ?? null,
    recurringTemplateId: row.recurringTemplateId,
    salesChannel: row.salesChannel,
    notes: row.notes,
  };
}

/** An expense's P&L month is always the month of its date (PRD §4: months are filters). */
function toRow(data: ExpenseData) {
  return {
    ...data,
    expenseDate: isoDateToDate(data.expenseDate),
    paidOn: data.paidOn ? isoDateToDate(data.paidOn) : null,
    month: monthKeyToDbDate(monthOfIsoDate(data.expenseDate)),
  };
}

const LIVE = { deletedAt: null } as const;

export const expenseRepository = {
  async listForMonth(month: MonthKey): Promise<ExpenseRecord[]> {
    const rows = await db().expense.findMany({
      where: { ...LIVE, month: monthKeyToDbDate(month) },
      include: EXPENSE_INCLUDE,
      orderBy: [{ expenseDate: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(toRecord);
  },

  /** Advances: confirmed expenses paid in this month that count in a later month. */
  /** Every confirmed expense, for the founders' full data export (PRD §7). */
  async listAllConfirmed(): Promise<ExpenseRecord[]> {
    const rows = await db().expense.findMany({
      where: { ...LIVE, status: EntryStatus.CONFIRMED },
      include: EXPENSE_INCLUDE,
      orderBy: [{ expenseDate: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(toRecord);
  },

  /** Confirmed expenses across months, for drilling into a report figure. */
  async listConfirmedForMonths(months: readonly MonthKey[]): Promise<ExpenseRecord[]> {
    if (months.length === 0) return [];
    const rows = await db().expense.findMany({
      where: {
        ...LIVE,
        status: EntryStatus.CONFIRMED,
        month: { in: months.map(monthKeyToDbDate) },
      },
      include: EXPENSE_INCLUDE,
      orderBy: [{ expenseDate: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(toRecord);
  },

  async listAdvancesPaidIn(month: MonthKey): Promise<ExpenseRecord[]> {
    const { start, endExclusive } = monthDateRange(month);
    const rows = await db().expense.findMany({
      where: {
        ...LIVE,
        status: EntryStatus.CONFIRMED,
        paidOn: { gte: start, lt: endExclusive },
        month: { gte: endExclusive },
      },
      include: EXPENSE_INCLUDE,
      orderBy: { month: 'asc' },
    });
    return rows.map(toRecord);
  },

  async listByKindForMonth(
    month: MonthKey,
    kind: ExpenseKind,
  ): Promise<{ id: string; status: EntryStatus; payeeTeamMemberId: string | null }[]> {
    return db().expense.findMany({
      where: { ...LIVE, kind, month: monthKeyToDbDate(month) },
      select: { id: true, status: true, payeeTeamMemberId: true },
    });
  },

  countDraftsForMonth(month: MonthKey): Promise<number> {
    return db().expense.count({
      where: { ...LIVE, status: EntryStatus.DRAFT, month: monthKeyToDbDate(month) },
    });
  },

  countForMonth(month: MonthKey): Promise<number> {
    return db().expense.count({ where: { ...LIVE, month: monthKeyToDbDate(month) } });
  },

  async findById(id: string): Promise<ExpenseRecord | null> {
    const row = await db().expense.findFirst({ where: { ...LIVE, id }, include: EXPENSE_INCLUDE });
    return row ? toRecord(row) : null;
  },

  async create(data: ExpenseData, actorId: string): Promise<ExpenseRecord> {
    const row = await db().expense.create({
      data: { ...toRow(data), createdById: actorId },
      include: EXPENSE_INCLUDE,
    });
    return toRecord(row);
  },

  async update(id: string, data: ExpenseData, actorId: string): Promise<ExpenseRecord> {
    const row = await db().expense.update({
      where: { id },
      data: { ...toRow(data), updatedById: actorId },
      include: EXPENSE_INCLUDE,
    });
    return toRecord(row);
  },

  async setStatus(id: string, status: EntryStatus, actorId: string): Promise<ExpenseRecord> {
    const row = await db().expense.update({
      where: { id },
      data: { status, updatedById: actorId },
      include: EXPENSE_INCLUDE,
    });
    return toRecord(row);
  },

  async softDelete(id: string, actorId: string): Promise<ExpenseRecord> {
    const row = await db().expense.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: actorId },
      include: EXPENSE_INCLUDE,
    });
    return toRecord(row);
  },

  /** Includes deleted drafts: deleting a generated draft means "skip it this month". */
  async templateIdsGeneratedFor(month: MonthKey): Promise<Set<string>> {
    const rows = await db().expense.findMany({
      where: { month: monthKeyToDbDate(month), recurringTemplateId: { not: null } },
      select: { recurringTemplateId: true },
    });
    return new Set(
      rows.flatMap((row) => (row.recurringTemplateId ? [row.recurringTemplateId] : [])),
    );
  },

  /** Sales spend for Sales CAC: confirmed sales-line expenses plus anything tagged with a channel. */
  async salesSpendForMonths(months: readonly MonthKey[]) {
    if (months.length === 0) return [];
    const rows = await db().expense.findMany({
      where: {
        ...LIVE,
        status: EntryStatus.CONFIRMED,
        month: { in: months.map(monthKeyToDbDate) },
        OR: [
          { salesChannel: { not: null } },
          { category: { pnlLine: { in: [PnlLine.SALES_SALARIES, PnlLine.SALES_OVERHEAD] } } },
        ],
      },
      select: { month: true, amount: true, currency: true, salesChannel: true },
    });
    return rows.map((row) => ({
      month: dateToMonthKey(row.month),
      amount: row.amount.toString(),
      currency: row.currency,
      salesChannel: row.salesChannel,
    }));
  },

  /** Confirmed expenses for the P&L of several months, in one query. */
  async pnlExpensesForMonths(months: readonly MonthKey[]) {
    if (months.length === 0) return [];
    const rows = await db().expense.findMany({
      where: {
        ...LIVE,
        status: EntryStatus.CONFIRMED,
        month: { in: months.map(monthKeyToDbDate) },
      },
      select: {
        month: true,
        amount: true,
        currency: true,
        fundingSource: true,
        categoryId: true,
        fundingPartnerId: true,
      },
    });
    return rows.map((row) => ({
      ...row,
      month: dateToMonthKey(row.month),
      amount: row.amount.toString(),
    }));
  },
};
