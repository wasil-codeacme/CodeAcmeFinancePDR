import type { FundingSource, PnlLine } from '@/generated/prisma/enums';
import type { DecimalString } from '@/lib/decimal';
import type { ReportColumn } from '@/lib/report-period';

export const VALUE_FORMAT = { MONEY: 'money', PERCENT: 'percent', COUNT: 'count' } as const;
export type ValueFormat = (typeof VALUE_FORMAT)[keyof typeof VALUE_FORMAT];

export const ROW_TONE = {
  NORMAL: 'normal',
  SUBTOTAL: 'subtotal',
  TOTAL: 'total',
  MUTED: 'muted',
} as const;
export type RowTone = (typeof ROW_TONE)[keyof typeof ROW_TONE];

/** What a figure is made of, so any number can open the entries behind it (PRD §5.7). */
export const DRILL_FIGURE = {
  REVENUE: 'revenue',
  ADJUSTMENTS: 'adjustments',
  EXPENSES: 'expenses',
  RECEIVABLES: 'receivables',
} as const;
export type DrillFigure = (typeof DRILL_FIGURE)[keyof typeof DRILL_FIGURE];

export type DrillTarget = { figure: DrillFigure; line?: PnlLine; funding?: FundingSource };

export type ReportRow = {
  key: string;
  label: string;
  format: ValueFormat;
  tone: RowTone;
  /** One value per column; null where it cannot be worked out (e.g. margin with no revenue). */
  values: (DecimalString | null)[];
  drill?: DrillTarget;
  /** Set when the row is not in the report's currency (take-home in PKR). */
  currency?: string;
};

export type ReportSection = { key: string; title: string; note?: string; rows: ReportRow[] };

/** One shape for every report, so the screen and the XLSX/CSV export can never disagree. */
export type ReportTable = {
  title: string;
  periodLabel: string;
  currency: string;
  columns: ReportColumn[];
  sections: ReportSection[];
  warnings: string[];
};
