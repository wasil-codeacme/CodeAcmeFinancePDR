import { AuditAction, PeriodStatus } from '@/generated/prisma/enums';
import { AUDIT_ENTITY } from '@/lib/constants';
import { MESSAGES } from '@/lib/messages';
import { type MonthKey, dateInMonth } from '@/lib/month';
import { closePostings } from '@/server/domain/partner-ledger';
import { toClosedPeriodSnapshot } from '@/server/domain/pnl-snapshot';
import { RuleViolationError } from '@/server/errors';
import { PNL_RESULT, type ReadyPnl, loadMonthlyPnl } from '@/server/read-models/monthly-pnl';
import { auditRepository } from '@/server/repositories/audit.repository';
import { runInTransaction } from '@/server/repositories/db';
import { expenseRepository } from '@/server/repositories/expense.repository';
import { ledgerRepository } from '@/server/repositories/ledger.repository';
import { periodRepository } from '@/server/repositories/period.repository';
import { revenueRepository } from '@/server/repositories/revenue.repository';
import type { SessionUser } from '@/types/auth';

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
