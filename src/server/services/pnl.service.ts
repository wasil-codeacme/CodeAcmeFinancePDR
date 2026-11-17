import { PeriodStatus } from '@/generated/prisma/enums';
import { type MonthKey, isMonthKey } from '@/lib/month';
import { parseClosedPeriodSnapshot } from '@/server/domain/pnl-snapshot';
import {
  type MonthlyPnlResult,
  PNL_RESULT,
  loadMonthlyPnl,
} from '@/server/read-models/monthly-pnl';
import { periodRepository } from '@/server/repositories/period.repository';

/**
 * The monthly P&L. A closed month is served from the snapshot it was closed with (PRD §5.6),
 * so later settings changes never alter it; open months are computed live. Founder-only
 * distribution figures are dropped for anyone who may not see them.
 */
export async function getMonthlyPnl(
  month: MonthKey,
  options: { includeDistribution: boolean },
): Promise<MonthlyPnlResult> {
  const period = await periodRepository.findByMonth(month);
  const snapshot =
    period?.status === PeriodStatus.CLOSED ? parseClosedPeriodSnapshot(period.snapshot) : null;
  if (!snapshot) return loadMonthlyPnl(month, options);
  return {
    kind: PNL_RESULT.READY,
    pnl: options.includeDistribution ? snapshot.pnl : { ...snapshot.pnl, distribution: null },
    rate:
      snapshot.rate && isMonthKey(snapshot.rate.month)
        ? { value: snapshot.rate.value, month: snapshot.rate.month }
        : null,
    currencies: snapshot.currencies,
    hasSplit: true,
    fundedByPartnerId: {},
    closedAt: period?.closedAt ?? null,
  };
}
