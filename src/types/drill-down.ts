import type { DecimalString } from '@/lib/decimal';

export const CELL_FORMAT = {
  TEXT: 'text',
  MONEY: 'money',
  DATE: 'date',
  MONTH: 'month',
} as const;
export type CellFormat = (typeof CELL_FORMAT)[keyof typeof CELL_FORMAT];

export type DrillColumn = { key: string; label: string; format: CellFormat; hideOnPhone?: boolean };

/** A money cell may be in another currency than the report (a PKR expense line). */
export type DrillCell = { value: string | null; currency?: string };

export type DrillRow = { id: string; href: string; cells: DrillCell[] };

/** The entries behind one report figure, with totals that add back up to it. */
export type DrillDownView = {
  title: string;
  periodLabel: string;
  currency: string;
  columns: DrillColumn[];
  rows: DrillRow[];
  totals: (DecimalString | null)[];
  note?: string;
};
