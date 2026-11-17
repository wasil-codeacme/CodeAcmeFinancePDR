import type { Frequency } from '@/generated/prisma/enums';
import { RECURRENCE_INTERVAL_MONTHS } from '@/lib/constants';
import { compareMonthKeys, type MonthKey, monthsBetween } from '@/lib/month';

type Schedule = {
  frequency: Frequency;
  startMonth: MonthKey;
  endMonth: MonthKey | null;
  active: boolean;
};

/** A template is due in its start month and every interval after, until its end month. */
export function isTemplateDue(schedule: Schedule, month: MonthKey): boolean {
  if (!schedule.active) return false;
  const elapsed = monthsBetween(schedule.startMonth, month);
  if (elapsed < 0) return false;
  if (schedule.endMonth && compareMonthKeys(month, schedule.endMonth) > 0) return false;
  return elapsed % RECURRENCE_INTERVAL_MONTHS[schedule.frequency] === 0;
}
