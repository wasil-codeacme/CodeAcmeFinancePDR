import { SalesChannel } from '@/generated/prisma/enums';
import { type MonthKey, formatMonthLabel } from '@/lib/month';
import { normalizeName, salesChannelFromItem } from '@/server/import/workbook-mapping';
import type { CellValue, SheetGrid } from '@/server/ports/spreadsheet-reader.port';

export const SALES_CAC_SHEET_PATTERN = /sales cac/i;

const HEADER_ROW = 3;
const FIRST_MONTH_COLUMN = 2;
const LAST_COLUMN = 26;
const INTERESTED_PATTERN = /interested response/i;
const LEADS_PATTERN = /leads closed/i;
const TOTAL_CALLS_LABEL = 'total calls made';
const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];
const SHORT_NAME_LENGTH = 3;

export type ParsedActivity = {
  month: MonthKey;
  channel: SalesChannel;
  interestedResponses: number;
  leadsClosed: number;
  callsMade: number;
};

export type ParsedSalesCac = { activity: ParsedActivity[]; warnings: string[] };

function columnLetter(column: number): string {
  return String.fromCharCode('A'.charCodeAt(0) + column - 1);
}

function count(value: CellValue): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function monthNumber(value: CellValue): number | null {
  if (typeof value !== 'string') return null;
  const name = normalizeName(value);
  const index = MONTH_NAMES.findIndex(
    (month) => name === month || name === month.slice(0, SHORT_NAME_LENGTH),
  );
  return index === -1 ? null : index + 1;
}

function monthColumns(sheet: SheetGrid, year: number): { column: number; month: MonthKey }[] {
  const columns: { column: number; month: MonthKey }[] = [];
  for (let column = FIRST_MONTH_COLUMN; column <= LAST_COLUMN; column += 1) {
    const number = monthNumber(sheet.value(`${columnLetter(column)}${HEADER_ROW}`));
    if (number === null) break;
    columns.push({ column, month: `${year}-${String(number).padStart(2, '0')}` });
  }
  return columns;
}

/** The cell holding "Total Calls Made" and the figure under it, anywhere on the sheet. */
function totalCalls(sheet: SheetGrid): number | null {
  for (let row = 1; row <= sheet.rowCount; row += 1) {
    for (let column = 1; column <= LAST_COLUMN; column += 1) {
      const label = sheet.value(`${columnLetter(column)}${row}`);
      if (typeof label === 'string' && normalizeName(label) === TOTAL_CALLS_LABEL) {
        return count(sheet.value(`${columnLetter(column)}${row + 1}`));
      }
    }
  }
  return null;
}

/**
 * The workbook's "CodeAcme Sales CAC" sheet: interested responses and leads closed per
 * channel by month (PRD §5.8). The sheet names months without a year, so the caller
 * passes the year of the workbook's month tabs.
 */
export function parseSalesCacSheet(sheet: SheetGrid, year: number): ParsedSalesCac {
  const columns = monthColumns(sheet, year);
  const byKey = new Map<string, ParsedActivity>();
  const entry = (month: MonthKey, channel: SalesChannel) => {
    const key = `${month}:${channel}`;
    const existing = byKey.get(key) ?? {
      month,
      channel,
      interestedResponses: 0,
      leadsClosed: 0,
      callsMade: 0,
    };
    byKey.set(key, existing);
    return existing;
  };
  for (let row = 1; row <= sheet.rowCount; row += 1) {
    const label = sheet.value(`A${row}`);
    if (typeof label !== 'string') continue;
    const isInterested = INTERESTED_PATTERN.test(label);
    if (!isInterested && !LEADS_PATTERN.test(label)) continue;
    const channel = salesChannelFromItem(label);
    if (!channel) continue;
    for (const { column, month } of columns) {
      const value = count(sheet.value(`${columnLetter(column)}${row}`));
      if (value === 0) continue;
      const target = entry(month, channel);
      if (isInterested) target.interestedResponses += value;
      else target.leadsClosed += value;
    }
  }
  const warnings: string[] = [];
  const calls = totalCalls(sheet);
  const lastMonth = columns.at(-1)?.month;
  if (calls && lastMonth) {
    entry(lastMonth, SalesChannel.COLD_CALL).callsMade += calls;
    warnings.push(
      `"Total Calls Made" (${calls}) has no month; it was put on ${formatMonthLabel(lastMonth)}.`,
    );
  }
  return { activity: [...byKey.values()], warnings };
}
