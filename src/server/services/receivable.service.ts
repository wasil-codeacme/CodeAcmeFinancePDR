import {
  AdjustmentKind,
  AuditAction,
  EntryStatus,
  InvoiceStatus,
  ProjectStatus,
  RevenueKind,
} from '@/generated/prisma/enums';
import { AUDIT_ENTITY } from '@/lib/constants';
import { Decimal, ZERO, sumDecimals } from '@/lib/decimal';
import { MESSAGES } from '@/lib/messages';
import { monthOfIsoDate, toIsoDate, toMonthKey } from '@/lib/month';
import { PERMISSION, hasPermission } from '@/lib/permissions';
import { AGEING_BUCKET_ORDER, ageInDays, ageingBucket } from '@/server/domain/ageing';
import { summarizeReceivables } from '@/server/domain/revenue-math';
import { figuresOf, toReceivableTotalsView, toRevenueRow } from '@/server/domain/revenue-view';
import { ForbiddenError, NotFoundError, RuleViolationError } from '@/server/errors';
import { assertMonthsOpen, isMonthClosed } from '@/server/period-guard';
import { auditedChange, auditedCreate } from '@/server/repositories/audited-write';
import { clientRepository } from '@/server/repositories/client.repository';
import { revenueRepository } from '@/server/repositories/revenue.repository';
import type {
  AdjustReceivableInput,
  RecordReceiptInput,
  ReleaseEscrowInput,
  StandaloneReceivableInput,
} from '@/server/validators/revenue.schema';
import type { SessionUser } from '@/types/auth';
import type { ReceivablesView } from '@/types/receivable';
import type { RevenueEntryRecord } from '@/types/revenue';

/** PRD §5.2: every confirmed entry with something still outstanding, across all months. */
export async function getReceivables(today: Date): Promise<ReceivablesView> {
  const entries = await revenueRepository.listConfirmed();
  const allFigures = entries.map(figuresOf);
  const open = entries
    .map((entry, index) => ({ entry, figures: allFigures[index] }))
    .filter(({ figures }) => figures?.outstanding.greaterThan(ZERO));
  const todayIso = toIsoDate(today);
  const items = open.map(({ entry }) => {
    const ageDays = ageInDays(entry.bookingMonth, today);
    return {
      ...toRevenueRow(entry),
      ageDays,
      ageingBucket: ageingBucket(ageDays),
      isOverdue: entry.expectedDate !== null && entry.expectedDate < todayIso,
    };
  });
  const ageing = AGEING_BUCKET_ORDER.map((bucket) => ({
    bucket,
    outstanding: sumDecimals(
      items
        .filter((item) => item.ageingBucket === bucket)
        .map((item) => new Decimal(item.figures.outstanding)),
    ).toString(),
  }));
  const bookedFigures = entries
    .map((entry, index) => ({ entry, figures: allFigures[index] }))
    .filter(({ entry }) => entry.kind === RevenueKind.BOOKED)
    .flatMap(({ figures }) => (figures ? [figures] : []));
  return { items, ageing, totals: toReceivableTotalsView(summarizeReceivables(bookedFigures)) };
}

async function requireConfirmedEntry(id: string): Promise<RevenueEntryRecord> {
  const entry = await revenueRepository.findById(id);
  if (!entry || entry.status !== EntryStatus.CONFIRMED) throw new NotFoundError();
  return entry;
}

function invoiceStatusAfter(outstanding: Decimal): InvoiceStatus {
  return outstanding.lessThanOrEqualTo(ZERO) ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;
}

/** "Mark received": full or partial; escrow funding is recorded as safe but not yet cash. */
export async function recordReceipt(actor: SessionUser, input: RecordReceiptInput): Promise<void> {
  await assertMonthsOpen(monthOfIsoDate(input.receivedOn));
  const entry = await requireConfirmedEntry(input.revenueEntryId);
  const figures = figuresOf(entry);
  const amount = new Decimal(input.amount);
  const limit = input.isEscrow ? figures.unfunded : figures.outstanding;
  if (amount.greaterThan(limit)) {
    throw new RuleViolationError(
      input.isEscrow
        ? MESSAGES.RECEIVABLE.ESCROW_EXCEEDS_UNFUNDED
        : MESSAGES.RECEIVABLE.AMOUNT_EXCEEDS_OUTSTANDING,
    );
  }
  await auditedCreate(actor.id, AUDIT_ENTITY.RECEIPT, async () => {
    const receipt = await revenueRepository.createReceipt({ ...input, createdById: actor.id });
    if (!input.isEscrow) {
      const invoiceStatus = invoiceStatusAfter(figures.outstanding.minus(amount));
      await revenueRepository.update(entry.id, { invoiceStatus }, actor.id);
    }
    return receipt;
  });
}

export async function releaseEscrow(actor: SessionUser, input: ReleaseEscrowInput): Promise<void> {
  const receipt = await revenueRepository.findReceipt(input.receiptId);
  if (!receipt) throw new NotFoundError();
  if (!receipt.isEscrow) throw new RuleViolationError(MESSAGES.RECEIVABLE.RECEIPT_NOT_ESCROW);
  await assertMonthsOpen(monthOfIsoDate(input.receivedOn));
  await auditedChange(actor.id, {
    action: AuditAction.UPDATE,
    entityType: AUDIT_ENTITY.RECEIPT,
    entityId: receipt.id,
    loadBefore: async () => receipt,
    apply: async () => {
      const released = await revenueRepository.releaseEscrow(receipt.id, input);
      const entry = await requireConfirmedEntry(receipt.revenueEntryId);
      await revenueRepository.update(
        entry.id,
        { invoiceStatus: invoiceStatusAfter(figuresOf(entry).outstanding) },
        actor.id,
      );
      return released;
    },
  });
}

export async function deleteReceipt(actor: SessionUser, receiptId: string): Promise<void> {
  if (!hasPermission(actor.role, PERMISSION.ENTRIES_DELETE_CONFIRMED)) throw new ForbiddenError();
  const receipt = await revenueRepository.findReceipt(receiptId);
  if (!receipt) throw new NotFoundError();
  await assertMonthsOpen(toMonthKey(receipt.receivedOn));
  await auditedChange(actor.id, {
    action: AuditAction.DELETE,
    entityType: AUDIT_ENTITY.RECEIPT,
    entityId: receiptId,
    loadBefore: async () => receipt,
    apply: () => revenueRepository.softDeleteReceipt(receiptId),
  });
}

/**
 * Reduces or writes off money that will not arrive. It lowers profit in the booking month
 * while that month is open; once it is closed, the adjustment posts to the month of the
 * adjustment date instead (PRD §5.6), so closed figures never change.
 */
export async function adjustReceivable(
  actor: SessionUser,
  input: AdjustReceivableInput,
): Promise<void> {
  const entry = await requireConfirmedEntry(input.revenueEntryId);
  const { outstanding } = figuresOf(entry);
  if (!outstanding.greaterThan(ZERO))
    throw new RuleViolationError(MESSAGES.RECEIVABLE.NOTHING_OUTSTANDING);
  const amount =
    input.kind === AdjustmentKind.WRITE_OFF ? outstanding : new Decimal(input.amount ?? 0);
  if (amount.greaterThan(outstanding))
    throw new RuleViolationError(MESSAGES.RECEIVABLE.AMOUNT_EXCEEDS_OUTSTANDING);
  const postingMonth = (await isMonthClosed(entry.bookingMonth))
    ? monthOfIsoDate(input.adjustedOn)
    : entry.bookingMonth;
  await assertMonthsOpen(postingMonth);
  await auditedCreate(actor.id, AUDIT_ENTITY.RECEIVABLE_ADJUSTMENT, () =>
    revenueRepository.createAdjustment({
      revenueEntryId: entry.id,
      adjustedOn: input.adjustedOn,
      postingMonth,
      amount: amount.toString(),
      kind: input.kind,
      reason: input.reason,
      createdById: actor.id,
    }),
  );
}

export async function moveExpectedDate(
  actor: SessionUser,
  revenueEntryId: string,
  expectedDate: string,
): Promise<void> {
  await auditedChange(actor.id, {
    action: AuditAction.UPDATE,
    entityType: AUDIT_ENTITY.REVENUE_ENTRY,
    entityId: revenueEntryId,
    loadBefore: () => requireConfirmedEntry(revenueEntryId),
    apply: () => revenueRepository.update(revenueEntryId, { expectedDate }, actor.id),
  });
}

/**
 * Money expected that is not booked revenue (e.g. owed from before the app was used).
 * It is tracked and collected like any receivable but never counted in the P&L.
 */
export async function createStandaloneReceivable(
  actor: SessionUser,
  input: StandaloneReceivableInput,
): Promise<void> {
  await assertMonthsOpen(input.bookingMonth);
  if (!(await clientRepository.findById(input.clientId))) throw new NotFoundError();
  await auditedCreate(actor.id, AUDIT_ENTITY.REVENUE_ENTRY, () =>
    revenueRepository.create(
      {
        kind: RevenueKind.STANDALONE,
        status: EntryStatus.CONFIRMED,
        clientId: input.clientId,
        projectId: null,
        platformId: null,
        bookingMonth: input.bookingMonth,
        description: input.description,
        gross: input.amount,
        feePercent: '0',
        projectStatus: ProjectStatus.IN_PROGRESS,
        invoiceStatus: InvoiceStatus.INITIATED,
        referredBy: null,
        closedByTeamMemberId: null,
        expectedDate: input.expectedDate,
        notes: null,
      },
      actor.id,
    ),
  );
}
