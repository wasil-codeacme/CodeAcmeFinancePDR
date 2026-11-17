import { MONTHS_PER_QUARTER, MONTHS_PER_YEAR } from '@/lib/constants';

/** A calendar month as `YYYY-MM`; the app's unit for filtering, rates and settings versions. */
export type MonthKey = `${number}-${string}`;

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_LABEL_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const LONG_MONTH_LABEL_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const DATE_LABEL_FORMAT = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export function isMonthKey(value: string): value is MonthKey {
  return MONTH_KEY_PATTERN.test(value);
}

export function isIsoDate(value: string): boolean {
  return ISO_DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toMonthKey(date: Date): MonthKey {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

export function monthKeyToDate(month: MonthKey): Date {
  return new Date(`${month}-01T00:00:00.000Z`);
}

export function isoDateToDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function monthOfIsoDate(isoDate: string): MonthKey {
  return toMonthKey(isoDateToDate(isoDate));
}

export function addMonths(month: MonthKey, count: number): MonthKey {
  const date = monthKeyToDate(month);
  date.setUTCMonth(date.getUTCMonth() + count);
  return toMonthKey(date);
}

/** Whole months from `from` to `to` (negative when `to` is earlier). */
export function monthsBetween(from: MonthKey, to: MonthKey): number {
  const fromDate = monthKeyToDate(from);
  const toDate = monthKeyToDate(to);
  return (
    (toDate.getUTCFullYear() - fromDate.getUTCFullYear()) * MONTHS_PER_YEAR +
    (toDate.getUTCMonth() - fromDate.getUTCMonth())
  );
}

export function compareMonthKeys(left: MonthKey, right: MonthKey): number {
  return left.localeCompare(right);
}

export function currentMonthKey(now: Date): MonthKey {
  return toMonthKey(now);
}

/** Reads `?month=` from a page's search params, defaulting to the current month. */
export function monthFromSearchParam(value: string | string[] | undefined, now: Date): MonthKey {
  return typeof value === 'string' && isMonthKey(value) ? value : currentMonthKey(now);
}

export function monthDateRange(month: MonthKey): { start: Date; endExclusive: Date } {
  return { start: monthKeyToDate(month), endExclusive: monthKeyToDate(addMonths(month, 1)) };
}

/** A date inside `month`, clamped to the month's last day. */
export function dateInMonth(month: MonthKey, dayOfMonth: number): string {
  const lastDay = new Date(monthKeyToDate(addMonths(month, 1)).getTime() - 1).getUTCDate();
  return `${month}-${pad(Math.min(dayOfMonth, lastDay))}`;
}

export function quarterOfMonth(month: MonthKey): number {
  return Math.floor(monthKeyToDate(month).getUTCMonth() / MONTHS_PER_QUARTER) + 1;
}

export function formatMonthLabel(month: MonthKey): string {
  return MONTH_LABEL_FORMAT.format(monthKeyToDate(month));
}

export function formatLongMonthLabel(month: MonthKey): string {
  return LONG_MONTH_LABEL_FORMAT.format(monthKeyToDate(month));
}

export function formatDateLabel(isoDate: string): string {
  return DATE_LABEL_FORMAT.format(isoDateToDate(isoDate));
}
