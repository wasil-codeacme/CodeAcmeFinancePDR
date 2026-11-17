import { AGEING_BUCKET_LIMITS_DAYS, MS_PER_DAY } from '@/lib/constants';
import { type MonthKey, monthKeyToDate } from '@/lib/month';

export const AGEING_BUCKET = {
  DAYS_0_30: '0–30 days',
  DAYS_31_60: '31–60 days',
  DAYS_61_90: '61–90 days',
  DAYS_OVER_90: '90+ days',
} as const;
export type AgeingBucket = (typeof AGEING_BUCKET)[keyof typeof AGEING_BUCKET];

export const AGEING_BUCKET_ORDER: readonly AgeingBucket[] = Object.values(AGEING_BUCKET);

/** Age counts from the first day of the month the work was booked in. */
export function ageInDays(bookingMonth: MonthKey, today: Date): number {
  return Math.max(
    0,
    Math.floor((today.getTime() - monthKeyToDate(bookingMonth).getTime()) / MS_PER_DAY),
  );
}

export function ageingBucket(days: number): AgeingBucket {
  const [thirty, sixty, ninety] = AGEING_BUCKET_LIMITS_DAYS;
  if (days <= thirty) return AGEING_BUCKET.DAYS_0_30;
  if (days <= sixty) return AGEING_BUCKET.DAYS_31_60;
  if (days <= ninety) return AGEING_BUCKET.DAYS_61_90;
  return AGEING_BUCKET.DAYS_OVER_90;
}
