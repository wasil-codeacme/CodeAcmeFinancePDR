import { RevenueKind } from '@/generated/prisma/enums';
import type { MonthKey } from '@/lib/month';
import type { MonthlyPnl } from '@/server/domain/pnl';
import { figuresOf } from '@/server/domain/revenue-view';
import { PNL_RESULT, readPnlRange } from '@/server/read-models/monthly-pnl';
import { revenueRepository } from '@/server/repositories/revenue.repository';
import type { BookedFigures } from '@/server/reports/receivables-report';
import type { RevenueEntryRecord } from '@/types/revenue';

/** Each month's P&L (closed months from their snapshot), null where it can't be computed. */
export async function loadMonthlyPnls(
  months: readonly MonthKey[],
  includeDistribution: boolean,
): Promise<Map<MonthKey, MonthlyPnl | null>> {
  const results = await readPnlRange(months, { includeDistribution });
  return new Map(
    months.map((month) => {
      const result = results.get(month);
      return [month, result?.kind === PNL_RESULT.READY ? result.pnl : null];
    }),
  );
}

/** Booked, confirmed work with its figures as of today, by booking month. */
export async function loadBookedFigures(
  /** null = every month (all receivables, e.g. for the dashboard). */
  months: readonly MonthKey[] | null,
): Promise<BookedFigures[]> {
  const entries =
    months === null
      ? (await revenueRepository.listConfirmed()).filter(
          (entry) => entry.kind === RevenueKind.BOOKED,
        )
      : await revenueRepository.listConfirmedBookedForMonths(months);
  return entries.map((entry) => ({ month: entry.bookingMonth, figures: figuresOf(entry) }));
}

/** Booked, confirmed entries in the given months (revenue by client and platform). */
export function loadBookedEntries(months: readonly MonthKey[]): Promise<RevenueEntryRecord[]> {
  return revenueRepository.listConfirmedBookedForMonths(months);
}
