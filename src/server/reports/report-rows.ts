import type { Decimal } from '@/lib/decimal';
import {
  type DrillTarget,
  ROW_TONE,
  type ReportRow,
  type RowTone,
  VALUE_FORMAT,
  type ValueFormat,
} from '@/types/report';

type RowOptions = { tone?: RowTone; drill?: DrillTarget; currency?: string };

function toRow(
  key: string,
  label: string,
  format: ValueFormat,
  values: readonly (Decimal | number | null)[],
  options: RowOptions,
): ReportRow {
  return {
    key,
    label,
    format,
    tone: options.tone ?? ROW_TONE.NORMAL,
    values: values.map((value) => (value === null ? null : value.toString())),
    ...(options.drill && { drill: options.drill }),
    ...(options.currency && { currency: options.currency }),
  };
}

export function moneyRow(
  key: string,
  label: string,
  values: readonly (Decimal | null)[],
  options: RowOptions = {},
): ReportRow {
  return toRow(key, label, VALUE_FORMAT.MONEY, values, options);
}

/** Ratios are kept as fractions (0.25 = 25 %); the UI and the export format them. */
export function percentRow(
  key: string,
  label: string,
  values: readonly (Decimal | null)[],
  options: RowOptions = {},
): ReportRow {
  return toRow(key, label, VALUE_FORMAT.PERCENT, values, options);
}

export function countRow(
  key: string,
  label: string,
  values: readonly (number | null)[],
  options: RowOptions = {},
): ReportRow {
  return toRow(key, label, VALUE_FORMAT.COUNT, values, options);
}

/** Optional lines (write-offs, unused external lines) only appear when they carry a figure. */
export function hasFigures(row: ReportRow): boolean {
  return row.values.some((value) => value !== null && Number(value) !== 0);
}
