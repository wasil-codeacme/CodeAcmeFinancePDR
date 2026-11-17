import { compareMonthKeys, type MonthKey } from '@/lib/month';

/**
 * Settings are versioned by the month they take effect from (PRD §5.5); the value for a
 * month is the latest version that started on or before it.
 */
export function pickEffectiveVersion<TVersion extends { effectiveFrom: MonthKey }>(
  versions: readonly TVersion[],
  month: MonthKey,
): TVersion | null {
  let effective: TVersion | null = null;
  for (const version of versions) {
    const startsByMonth = compareMonthKeys(version.effectiveFrom, month) <= 0;
    const isLater =
      !effective || compareMonthKeys(version.effectiveFrom, effective.effectiveFrom) > 0;
    if (startsByMonth && isLater) effective = version;
  }
  return effective;
}
