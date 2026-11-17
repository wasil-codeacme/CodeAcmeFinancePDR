import { type MonthKey, isMonthKey } from '@/lib/month';
import type { CellValue, SheetGrid } from '@/server/ports/spreadsheet-reader.port';

/**
 * Reads the "Code Acme Business Revenue & P&L" workbook layout: one tab per month named
 * like "Jan 2026", a revenue table ending in a TOTALS row, then expense sections (a title
 * row followed by an "Item" header) each ending in "Total". Layout drift between months
 * (Mar/Apr merged client and platform into one column) is handled here, nowhere else.
 */

const MONTH_TAB_PATTERN = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})$/;
const MONTH_NUMBER: Record<string, string> = {
  Jan: '01',
  Feb: '02',
  Mar: '03',
  Apr: '04',
  May: '05',
  Jun: '06',
  Jul: '07',
  Aug: '08',
  Sep: '09',
  Oct: '10',
  Nov: '11',
  Dec: '12',
};
const RATE_CELL = 'C3';
const FIRST_REVENUE_ROW = 7;
const TOTALS_LABEL = 'totals';
const ITEM_HEADER = 'item';
const SECTION_TOTAL = 'total';
const EXPENSE_SUMMARY = 'expense summary';
const COMPANY_FUNDING = 'company expense';
const PARTNER_FUNDING_PATTERN = /^(.*\S)\s+funding$/i;
const FRACTION_TO_PERCENT = 100;
const PERCENT_DECIMALS = 4;

export const WORKBOOK_LABEL = {
  NET_REVENUE: 'net revenue (booked)',
  COMPANY_EXPENSE: 'total company expense',
  NET_PROFIT: 'net profit (company only)',
} as const;

export type ParsedRevenueLine = {
  row: number;
  clientLabel: string;
  platformLabel: string | null;
  gross: number;
  feePercent: number;
  received: number;
  projectStatus: string | null;
  invoiceStatus: string | null;
  referredBy: string | null;
};

export type ParsedExpenseLine = {
  row: number;
  section: string;
  item: string;
  amount: number;
  /** The workbook keeps PKR in column C and USD in column D; whichever was typed is the source. */
  inReportingCurrency: boolean;
  fundingPartnerName: string | null;
  note: string | null;
};

export type ParsedMonth = {
  tab: string;
  month: MonthKey;
  rate: number | null;
  revenue: ParsedRevenueLine[];
  expenses: ParsedExpenseLine[];
  workbookTotals: {
    netRevenue: number | null;
    companyExpense: number | null;
    netProfit: number | null;
  };
  warnings: string[];
};

function text(value: CellValue): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value.trim();
  if (typeof value === 'number') return String(value);
  return null;
}

function numeric(value: CellValue): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function findRow(sheet: SheetGrid, label: string, fromRow = 1): number | null {
  for (let row = fromRow; row <= sheet.rowCount; row += 1) {
    if (
      text(sheet.value(`B${row}`))
        ?.toLowerCase()
        .startsWith(label)
    )
      return row;
  }
  return null;
}

export function monthOfTab(tab: string): MonthKey | null {
  const match = MONTH_TAB_PATTERN.exec(tab.trim());
  if (!match?.[1] || !match[2]) return null;
  const month = `${match[2]}-${MONTH_NUMBER[match[1]] ?? ''}`;
  return isMonthKey(month) ? month : null;
}

function parseRevenue(sheet: SheetGrid, warnings: string[]): ParsedRevenueLine[] {
  const totalsRow = findRow(sheet, TOTALS_LABEL, FIRST_REVENUE_ROW);
  if (totalsRow === null) {
    warnings.push('No TOTALS row found under the revenue table; revenue skipped.');
    return [];
  }
  const lines: ParsedRevenueLine[] = [];
  for (let row = FIRST_REVENUE_ROW; row < totalsRow; row += 1) {
    const gross = numeric(sheet.value(`E${row}`));
    // Headers drifted between months: trust the cells. Text in D means "platform | client";
    // otherwise C holds "Client - Platform" and D is the project value.
    const clientInD = typeof sheet.value(`D${row}`) === 'string';
    const clientLabel = text(sheet.value(clientInD ? `D${row}` : `C${row}`));
    if (gross === null || gross === 0 || clientLabel === null) continue;
    lines.push({
      row,
      clientLabel,
      platformLabel: clientInD ? text(sheet.value(`C${row}`)) : null,
      gross,
      feePercent: Number(
        ((numeric(sheet.value(`F${row}`)) ?? 0) * FRACTION_TO_PERCENT).toFixed(PERCENT_DECIMALS),
      ),
      received: numeric(sheet.value(`I${row}`)) ?? 0,
      projectStatus: text(sheet.value(`J${row}`)),
      invoiceStatus: text(sheet.value(`K${row}`)),
      referredBy: text(sheet.value(`L${row}`)),
    });
  }
  return lines;
}

function fundingPartner(funding: string | null, warnings: string[], row: number): string | null {
  if (funding === null || funding.toLowerCase() === COMPANY_FUNDING) return null;
  const partner = PARTNER_FUNDING_PATTERN.exec(funding)?.[1];
  if (partner) return partner;
  warnings.push(`Row ${row}: funding source "${funding}" not recognised; treated as company.`);
  return null;
}

function parseExpenseLine(
  sheet: SheetGrid,
  row: number,
  section: string,
  warnings: string[],
): ParsedExpenseLine | null {
  const item = text(sheet.value(`B${row}`));
  const pkr = numeric(sheet.value(`C${row}`));
  const usd = numeric(sheet.value(`D${row}`));
  const usdWasTyped = usd !== null && sheet.formula(`D${row}`) === null;
  const amount = usdWasTyped ? usd : pkr;
  if (item === null || amount === null || amount === 0) return null;
  return {
    row,
    section,
    item,
    amount,
    inReportingCurrency: usdWasTyped,
    fundingPartnerName: fundingPartner(text(sheet.value(`E${row}`)), warnings, row),
    note: text(sheet.value(`F${row}`)),
  };
}

function parseExpenses(sheet: SheetGrid, warnings: string[]): ParsedExpenseLine[] {
  const lines: ParsedExpenseLine[] = [];
  let section: string | null = null;
  for (let row = 1; row <= sheet.rowCount; row += 1) {
    const label = text(sheet.value(`B${row}`))?.toLowerCase() ?? null;
    if (label === EXPENSE_SUMMARY) break;
    if (text(sheet.value(`B${row + 1}`))?.toLowerCase() === ITEM_HEADER && label !== null) {
      section = text(sheet.value(`B${row}`));
      row += 1;
      continue;
    }
    if (label === SECTION_TOTAL) {
      section = null;
      continue;
    }
    if (section === null) continue;
    const line = parseExpenseLine(sheet, row, section, warnings);
    if (line) lines.push(line);
  }
  return lines;
}

/** Excel omits the cached result of a formula that evaluates to 0, so a formula with no value is 0. */
function totalBesideLabel(sheet: SheetGrid, label: string): number | null {
  const row = findRow(sheet, label);
  if (row === null) return null;
  const value = numeric(sheet.value(`C${row}`));
  return value === null && sheet.formula(`C${row}`) !== null ? 0 : value;
}

export function parseMonthSheet(sheet: SheetGrid, month: MonthKey): ParsedMonth {
  const warnings: string[] = [];
  return {
    tab: sheet.name,
    month,
    rate: numeric(sheet.value(RATE_CELL)),
    revenue: parseRevenue(sheet, warnings),
    expenses: parseExpenses(sheet, warnings),
    workbookTotals: {
      netRevenue: totalBesideLabel(sheet, WORKBOOK_LABEL.NET_REVENUE),
      companyExpense: totalBesideLabel(sheet, WORKBOOK_LABEL.COMPANY_EXPENSE),
      netProfit: totalBesideLabel(sheet, WORKBOOK_LABEL.NET_PROFIT),
    },
    warnings,
  };
}

/** Every visible month tab, oldest first; hidden tabs (e.g. an old January layout) are ignored. */
export function parseWorkbook(sheets: readonly SheetGrid[]): ParsedMonth[] {
  return sheets
    .filter((sheet) => !sheet.hidden)
    .flatMap((sheet) => {
      const month = monthOfTab(sheet.name);
      return month ? [parseMonthSheet(sheet, month)] : [];
    })
    .sort((left, right) => left.month.localeCompare(right.month));
}
