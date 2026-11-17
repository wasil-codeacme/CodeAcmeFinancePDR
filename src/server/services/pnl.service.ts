import type { MonthKey } from '@/lib/month';
import { type MonthlyPnlResult, readMonthlyPnl } from '@/server/read-models/monthly-pnl';

/** The monthly P&L report: closed months from their snapshot, open months live. */
export function getMonthlyPnl(
  month: MonthKey,
  options: { includeDistribution: boolean },
): Promise<MonthlyPnlResult> {
  return readMonthlyPnl(month, options);
}
