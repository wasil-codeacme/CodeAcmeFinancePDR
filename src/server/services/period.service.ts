import { AuditAction, ExpenseKind, PeriodStatus } from '@/generated/prisma/enums';
import { AUDIT_ENTITY } from '@/lib/constants';
import { MESSAGES } from '@/lib/messages';
import { sumDecimals } from '@/lib/decimal';
import { type MonthKey, addMonths, dateInMonth } from '@/lib/month';
import { closePostings } from '@/server/domain/partner-ledger';
import { toClosedPeriodSnapshot } from '@/server/domain/pnl-snapshot';
import { NotFoundError, RuleViolationError } from '@/server/errors';
import { assertMonthsOpen } from '@/server/period-guard';
import { loadBdCommission } from '@/server/read-models/bd-commission';
import {
  PNL_RESULT,
  type ReadyPnl,
  loadMonthlyPnl,
  readMonthlyPnl,
} from '@/server/read-models/monthly-pnl';
import { accountBalanceRepository } from '@/server/repositories/account-balance.repository';
import { auditedChange, auditedCreate } from '@/server/repositories/audited-write';
import { auditRepository } from '@/server/repositories/audit.repository';
import { runInTransaction } from '@/server/repositories/db';
import { expenseRepository } from '@/server/repositories/expense.repository';
import { ledgerRepository } from '@/server/repositories/ledger.repository';
import {
  nextMonthReserveRepository,
  periodRepository,
} from '@/server/repositories/period.repository';
import { revenueRepository } from '@/server/repositories/revenue.repository';
import { accountRepository } from '@/server/repositories/settings.repository';
import type { SessionUser } from '@/types/auth';
import type { CloseOverview } from '@/types/period';

const LAST_DAY = 31;

async function requireClosablePnl(month: MonthKey): Promise<ReadyPnl> {
  const period = await periodRepository.findByMonth(month);
  if (period?.status === PeriodStatus.CLOSED) {
    throw new RuleViolationError(MESSAGES.PERIOD.ALREADY_CLOSED);
  }
  const [revenueDrafts, expenseDrafts] = await Promise.all([
    revenueRepository.countDraftsForMonth(month),
    expenseRepository.countDraftsForMonth(month),
  ]);
  if (revenueDrafts + expenseDrafts > 0) throw new RuleViolationError(MESSAGES.PERIOD.DRAFTS_OPEN);
  const result = await loadMonthlyPnl(month, { includeDistribution: true });
  if (result.kind !== PNL_RESULT.READY) throw new RuleViolationError(MESSAGES.PNL.RATE_MISSING);
  if (!result.pnl.distribution) throw new RuleViolationError(MESSAGES.PNL.NO_SPLIT);
  return result;
}

/**
 * PRD §5.6: closing stores the month's P&L and distribution as a snapshot, posts each
 * partner's share, reserve and funding to their ledger, and makes the month read-only.
 */
export async function closeMonth(actor: SessionUser, month: MonthKey): Promise<void> {
  const result = await requireClosablePnl(month);
  const distribution = result.pnl.distribution;
  if (!distribution) throw new RuleViolationError(MESSAGES.PNL.NO_SPLIT);
  const postings = closePostings(distribution, result.fundedByPartnerId);
  const snapshot = toClosedPeriodSnapshot({
    pnl: result.pnl,
    rate: result.rate,
    currencies: result.currencies,
  });
  await runInTransaction(async () => {
    const period = await periodRepository.markClosed(month, {
      snapshot,
      closedById: actor.id,
      closedAt: new Date(),
    });
    for (const posting of postings) {
      await ledgerRepository.create({
        ...posting,
        month,
        occurredOn: dateInMonth(month, LAST_DAY),
        accountId: null,
        note: null,
        periodId: period.id,
        createdById: actor.id,
      });
    }
    await auditRepository.record({
      actorUserId: actor.id,
      action: AuditAction.CLOSE,
      entityType: AUDIT_ENTITY.PERIOD,
      entityId: period.id,
      after: { month, snapshot, postings },
    });
  });
}

/** A founder can reopen a closed month with a reason; exactly what its close posted is removed. */
export async function reopenMonth(
  actor: SessionUser,
  month: MonthKey,
  reason: string,
): Promise<void> {
  const period = await periodRepository.findByMonth(month);
  if (period?.status !== PeriodStatus.CLOSED) {
    throw new RuleViolationError(MESSAGES.PERIOD.NOT_CLOSED);
  }
  await runInTransaction(async () => {
    const removed = await ledgerRepository.softDeleteForPeriod(period.id);
    await periodRepository.markReopened(period.id, {
      reopenedById: actor.id,
      reopenedAt: new Date(),
      reopenReason: reason,
    });
    await auditRepository.record({
      actorUserId: actor.id,
      action: AuditAction.REOPEN,
      entityType: AUDIT_ENTITY.PERIOD,
      entityId: period.id,
      before: period,
      after: { month, reason, ledgerEntriesRemoved: removed },
    });
  });
}

/** Everything the month-close screen shows: readiness checks, the P&L, reserves and advances. */
export async function getCloseOverview(month: MonthKey): Promise<CloseOverview> {
  const [
    period,
    revenueDrafts,
    expenseDrafts,
    pnl,
    commission,
    posted,
    reserves,
    advances,
    balances,
    accounts,
  ] = await Promise.all([
    periodRepository.findByMonth(month),
    revenueRepository.countDraftsForMonth(month),
    expenseRepository.countDraftsForMonth(month),
    readMonthlyPnl(month, { includeDistribution: true }),
    loadBdCommission(month),
    expenseRepository.listByKindForMonth(month, ExpenseKind.BD_COMMISSION),
    nextMonthReserveRepository.listForMonth(month),
    expenseRepository.listAdvancesPaidIn(month),
    accountBalanceRepository.listBalances(),
    accountRepository.list(),
  ]);
  const activeAccounts = accounts.filter((account) => account.active);
  const enteredIds = new Set(
    balances.filter((balance) => balance.month === month).map((balance) => balance.accountId),
  );
  return {
    month,
    isClosed: period?.status === PeriodStatus.CLOSED,
    closedAt: period?.closedAt ?? null,
    reopenReason: period?.reopenReason ?? null,
    checks: {
      drafts: revenueDrafts + expenseDrafts,
      rateSet: pnl.kind === PNL_RESULT.READY && pnl.rate !== null,
      splitSet: pnl.kind === PNL_RESULT.READY && pnl.hasSplit,
      commissionDue: sumDecimals(commission.rows.map((row) => row.commission)).toString(),
      commissionPosted: posted.length > 0,
      balancesEntered: activeAccounts.filter((account) => enteredIds.has(account.id)).length,
      activeAccounts: activeAccounts.length,
    },
    pnl,
    reserves,
    advances,
  };
}

/** Cash set aside at close for next month's costs (replaces the hand-typed Closing cells). */
export async function addNextMonthReserve(
  actor: SessionUser,
  input: { month: MonthKey; amount: string; note: string | null },
): Promise<void> {
  await assertMonthsOpen(input.month);
  await auditedCreate(actor.id, AUDIT_ENTITY.NEXT_MONTH_RESERVE, () =>
    nextMonthReserveRepository.create({
      ...input,
      targetMonth: addMonths(input.month, 1),
      createdById: actor.id,
    }),
  );
}

export async function deleteNextMonthReserve(actor: SessionUser, id: string): Promise<void> {
  const reserve = await nextMonthReserveRepository.findById(id);
  if (!reserve) throw new NotFoundError();
  await assertMonthsOpen(reserve.month);
  await auditedChange(actor.id, {
    action: AuditAction.DELETE,
    entityType: AUDIT_ENTITY.NEXT_MONTH_RESERVE,
    entityId: id,
    loadBefore: async () => reserve,
    apply: () => nextMonthReserveRepository.softDelete(id),
  });
}
