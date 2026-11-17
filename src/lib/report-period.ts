import { MONTHS_PER_QUARTER, MONTHS_PER_YEAR } from '@/lib/constants';
import {
  type MonthKey,
  addMonths,
  compareMonthKeys,
  currentMonthKey,
  formatMonthLabel,
  quarterOfMonth,
} from '@/lib/month';

/** PRD §5.7: every report switches between a month, a quarter, year to date and a full year. */
export const PERIOD_KIND = {
  MONTH: 'month',
  QUARTER: 'quarter',
  YTD: 'ytd',
  YEAR: 'year',
} as const;
export type PeriodKind = (typeof PERIOD_KIND)[keyof typeof PERIOD_KIND];

export type ReportPeriod =
  | { kind: typeof PERIOD_KIND.MONTH; year: number; month: MonthKey }
  | { kind: typeof PERIOD_KIND.QUARTER; year: number; quarter: number }
  | { kind: typeof PERIOD_KIND.YTD; year: number }
  | { kind: typeof PERIOD_KIND.YEAR; year: number };

/** A column of a report: the months it adds up, and whether it is the period's total. */
export type ReportColumn = {
  key: string;
  label: string;
  months: MonthKey[];
  isTotal: boolean;
  /** The period this column covers on its own, for drilling into the entries behind it. */
  param: string;
};

const QUARTERS_PER_YEAR = MONTHS_PER_YEAR / MONTHS_PER_QUARTER;
const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const QUARTER_PATTERN = /^(\d{4})-q([1-4])$/;
const YTD_PATTERN = /^(\d{4})-ytd$/;
const YEAR_PATTERN = /^(\d{4})$/;
const SHORT_MONTH_FORMAT = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });

function monthKeyOf(year: number, monthNumber: number): MonthKey {
  return `${year}-${String(monthNumber).padStart(2, '0')}`;
}

function yearOf(month: MonthKey): number {
  return Number(month.slice(0, 4));
}

export function shortMonthLabel(month: MonthKey): string {
  return SHORT_MONTH_FORMAT.format(new Date(`${month}-01T00:00:00Z`));
}

function quarterMonths(year: number, quarter: number): MonthKey[] {
  const first = (quarter - 1) * MONTHS_PER_QUARTER + 1;
  return Array.from({ length: MONTHS_PER_QUARTER }, (_, offset) =>
    monthKeyOf(year, first + offset),
  );
}

function yearMonths(year: number): MonthKey[] {
  return Array.from({ length: MONTHS_PER_YEAR }, (_, offset) => monthKeyOf(year, offset + 1));
}

export function thisYearToDate(now: Date): ReportPeriod {
  return { kind: PERIOD_KIND.YTD, year: now.getUTCFullYear() };
}

/** Reads `?period=` (`2026-03`, `2026-q2`, `2026-ytd` or `2026`); defaults to this year to date. */
export function parseReportPeriod(value: string | string[] | undefined, now: Date): ReportPeriod {
  if (typeof value !== 'string') return thisYearToDate(now);
  const monthMatch = MONTH_PATTERN.exec(value);
  if (monthMatch)
    return { kind: PERIOD_KIND.MONTH, year: Number(monthMatch[1]), month: value as MonthKey };
  const quarterMatch = QUARTER_PATTERN.exec(value);
  if (quarterMatch) {
    return {
      kind: PERIOD_KIND.QUARTER,
      year: Number(quarterMatch[1]),
      quarter: Number(quarterMatch[2]),
    };
  }
  const ytdMatch = YTD_PATTERN.exec(value);
  if (ytdMatch) return { kind: PERIOD_KIND.YTD, year: Number(ytdMatch[1]) };
  const yearMatch = YEAR_PATTERN.exec(value);
  if (yearMatch) return { kind: PERIOD_KIND.YEAR, year: Number(yearMatch[1]) };
  return thisYearToDate(now);
}

export function toPeriodParam(period: ReportPeriod): string {
  switch (period.kind) {
    case PERIOD_KIND.MONTH:
      return period.month;
    case PERIOD_KIND.QUARTER:
      return `${period.year}-q${period.quarter}`;
    case PERIOD_KIND.YTD:
      return `${period.year}-ytd`;
    case PERIOD_KIND.YEAR:
      return String(period.year);
  }
}

/** Year to date stops at the current month; any other year's "to date" is the whole year. */
export function periodMonths(period: ReportPeriod, now: Date): MonthKey[] {
  switch (period.kind) {
    case PERIOD_KIND.MONTH:
      return [period.month];
    case PERIOD_KIND.QUARTER:
      return quarterMonths(period.year, period.quarter);
    case PERIOD_KIND.YEAR:
      return yearMonths(period.year);
    case PERIOD_KIND.YTD: {
      const current = currentMonthKey(now);
      return yearMonths(period.year).filter(
        (month) => period.year !== yearOf(current) || compareMonthKeys(month, current) <= 0,
      );
    }
  }
}

export function formatPeriodLabel(period: ReportPeriod, now: Date): string {
  switch (period.kind) {
    case PERIOD_KIND.MONTH:
      return formatMonthLabel(period.month);
    case PERIOD_KIND.QUARTER:
      return `Q${period.quarter} ${period.year}`;
    case PERIOD_KIND.YEAR:
      return String(period.year);
    case PERIOD_KIND.YTD: {
      const months = periodMonths(period, now);
      const first = months[0];
      const last = months.at(-1);
      if (!first || !last) return `${period.year} to date`;
      return `${period.year} to date (${shortMonthLabel(first)}–${shortMonthLabel(last)})`;
    }
  }
}

function totalLabel(period: ReportPeriod, now: Date): string {
  if (period.kind === PERIOD_KIND.YTD) return `${period.year} YTD`;
  return formatPeriodLabel(period, now);
}

function quarterColumns(months: readonly MonthKey[]): ReportColumn[] {
  return Array.from({ length: QUARTERS_PER_YEAR }, (_, index) => index + 1).flatMap((quarter) => {
    const inQuarter = months.filter((month) => quarterOfMonth(month) === quarter);
    return inQuarter.length === 0
      ? []
      : [
          {
            key: `q${quarter}`,
            label: `Q${quarter}`,
            months: inQuarter,
            isTotal: false,
            param: `${inQuarter[0]?.slice(0, 4)}-q${quarter}`,
          },
        ];
  });
}

/**
 * On screen a short period shows its months; a year shows quarters so the table fits on a
 * phone or laptop without sideways scrolling. A single month is just its own total.
 */
export function displayColumns(period: ReportPeriod, now: Date): ReportColumn[] {
  const months = periodMonths(period, now);
  const total = {
    key: 'total',
    label: totalLabel(period, now),
    months,
    isTotal: true,
    param: toPeriodParam(period),
  };
  if (period.kind === PERIOD_KIND.MONTH) {
    return [
      {
        key: period.month,
        label: formatMonthLabel(period.month),
        months,
        isTotal: true,
        param: period.month,
      },
    ];
  }
  if (period.kind === PERIOD_KIND.QUARTER) {
    const monthColumns = months.map((month) => ({
      key: month,
      label: shortMonthLabel(month),
      months: [month],
      isTotal: false,
      param: month,
    }));
    return [...monthColumns, total];
  }
  return [...quarterColumns(months), total];
}

/** Exports carry every month with quarter subtotals and the period total (PRD §5.7). */
export function exportColumns(period: ReportPeriod, now: Date): ReportColumn[] {
  const months = periodMonths(period, now);
  const columns = quarterColumns(months).flatMap((quarter) => [
    ...quarter.months.map((month) => ({
      key: month,
      label: shortMonthLabel(month),
      months: [month],
      isTotal: false,
      param: month,
    })),
    ...(months.length > MONTHS_PER_QUARTER || period.kind === PERIOD_KIND.QUARTER ? [quarter] : []),
  ]);
  if (period.kind === PERIOD_KIND.MONTH) return columns;
  if (period.kind === PERIOD_KIND.QUARTER) return columns;
  return [
    ...columns,
    {
      key: 'total',
      label: totalLabel(period, now),
      months,
      isTotal: true,
      param: toPeriodParam(period),
    },
  ];
}

export function shiftPeriod(period: ReportPeriod, step: number): ReportPeriod {
  switch (period.kind) {
    case PERIOD_KIND.MONTH: {
      const month = addMonths(period.month, step);
      return { kind: PERIOD_KIND.MONTH, year: yearOf(month), month };
    }
    case PERIOD_KIND.QUARTER: {
      const index = period.year * QUARTERS_PER_YEAR + (period.quarter - 1) + step;
      return {
        kind: PERIOD_KIND.QUARTER,
        year: Math.floor(index / QUARTERS_PER_YEAR),
        quarter: (index % QUARTERS_PER_YEAR) + 1,
      };
    }
    case PERIOD_KIND.YTD:
      return { kind: PERIOD_KIND.YTD, year: period.year + step };
    case PERIOD_KIND.YEAR:
      return { kind: PERIOD_KIND.YEAR, year: period.year + step };
  }
}

/** The month a period "points at", so switching kind keeps the same place in time. */
function anchorMonth(period: ReportPeriod, now: Date): MonthKey {
  if (period.kind === PERIOD_KIND.MONTH) return period.month;
  const months = periodMonths(period, now);
  return months.at(-1) ?? monthKeyOf(period.year, MONTHS_PER_YEAR);
}

export function withKind(period: ReportPeriod, kind: PeriodKind, now: Date): ReportPeriod {
  const anchor = anchorMonth(period, now);
  const year = yearOf(anchor);
  switch (kind) {
    case PERIOD_KIND.MONTH:
      return { kind, year, month: anchor };
    case PERIOD_KIND.QUARTER:
      return { kind, year, quarter: quarterOfMonth(anchor) };
    case PERIOD_KIND.YTD:
      return { kind, year };
    case PERIOD_KIND.YEAR:
      return { kind, year };
  }
}

export function isPeriodKind(value: string): value is PeriodKind {
  return Object.values<string>(PERIOD_KIND).includes(value);
}
