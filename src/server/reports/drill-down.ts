import { type FundingSource, type PnlLine, RevenueKind } from '@/generated/prisma/enums';
import { SEARCH_PARAM } from '@/lib/constants';
import { type Decimal, ZERO, sumDecimals } from '@/lib/decimal';
import { ADJUSTMENT_KIND_LABEL, FUNDING_SOURCE_LABEL, PNL_LINE_LABEL } from '@/lib/labels';
import type { MonthKey } from '@/lib/month';
import { ROUTES, withSearchParams } from '@/lib/routes';
import { figuresOf } from '@/server/domain/revenue-view';
import { CELL_FORMAT, type DrillColumn, type DrillRow } from '@/types/drill-down';
import type { ExpenseRecord } from '@/types/expense';
import type { RevenueEntryRecord } from '@/types/revenue';

export type DrillTable = {
  title: string;
  columns: DrillColumn[];
  rows: DrillRow[];
  totals: (string | null)[];
  note?: string;
};

const money = (value: Decimal | null) => ({ value: value === null ? null : value.toString() });
const text = (value: string | null) => ({ value });
const monthHref = (path: string, month: MonthKey) =>
  withSearchParams(path, { [SEARCH_PARAM.MONTH]: month });

function clientLabel(entry: RevenueEntryRecord): string {
  return entry.projectName ? `${entry.clientName} · ${entry.projectName}` : entry.clientName;
}

function bookedIn(entries: readonly RevenueEntryRecord[], months: readonly MonthKey[]) {
  return entries.filter(
    (entry) => entry.kind === RevenueKind.BOOKED && months.includes(entry.bookingMonth),
  );
}

/** Gross, fee and net of every booked entry: what "Gross revenue", "Platform fees" and "Net revenue" add up. */
export function revenueDrill(
  entries: readonly RevenueEntryRecord[],
  months: readonly MonthKey[],
): DrillTable {
  const rows = bookedIn(entries, months)
    .filter((entry) => entry.gross !== null)
    .map((entry) => ({ entry, figures: figuresOf(entry) }));
  return {
    title: 'Revenue',
    columns: [
      { key: 'month', label: 'Month', format: CELL_FORMAT.MONTH },
      { key: 'client', label: 'Client', format: CELL_FORMAT.TEXT },
      { key: 'platform', label: 'Platform', format: CELL_FORMAT.TEXT, hideOnPhone: true },
      { key: 'gross', label: 'Gross', format: CELL_FORMAT.MONEY, hideOnPhone: true },
      { key: 'fee', label: 'Fee', format: CELL_FORMAT.MONEY, hideOnPhone: true },
      { key: 'net', label: 'Net', format: CELL_FORMAT.MONEY },
    ],
    rows: rows.map(({ entry, figures }) => ({
      id: entry.id,
      href: monthHref(ROUTES.REVENUE, entry.bookingMonth),
      cells: [
        text(entry.bookingMonth),
        text(clientLabel(entry)),
        text(entry.platformName),
        money(figures.gross),
        money(figures.fee),
        money(figures.net),
      ],
    })),
    totals: [
      null,
      null,
      null,
      sumDecimals(rows.map((row) => row.figures.gross)).toString(),
      sumDecimals(rows.map((row) => row.figures.fee)).toString(),
      sumDecimals(rows.map((row) => row.figures.net)).toString(),
    ],
  };
}

/** Write-offs and reductions, by the month they post to (PRD §5.6). */
export function adjustmentsDrill(
  entries: readonly RevenueEntryRecord[],
  months: readonly MonthKey[],
): DrillTable {
  const rows = entries
    .filter((entry) => entry.kind === RevenueKind.BOOKED)
    .flatMap((entry) =>
      entry.adjustments
        .filter((adjustment) => months.includes(adjustment.postingMonth))
        .map((adjustment) => ({ entry, adjustment })),
    );
  return {
    title: 'Receivable write-offs and reductions',
    columns: [
      { key: 'date', label: 'Date', format: CELL_FORMAT.DATE },
      { key: 'client', label: 'Client', format: CELL_FORMAT.TEXT },
      { key: 'kind', label: 'Kind', format: CELL_FORMAT.TEXT, hideOnPhone: true },
      { key: 'reason', label: 'Reason', format: CELL_FORMAT.TEXT, hideOnPhone: true },
      { key: 'amount', label: 'Amount', format: CELL_FORMAT.MONEY },
    ],
    rows: rows.map(({ entry, adjustment }) => ({
      id: adjustment.id,
      href: ROUTES.RECEIVABLES,
      cells: [
        text(adjustment.adjustedOn),
        text(clientLabel(entry)),
        text(ADJUSTMENT_KIND_LABEL[adjustment.kind]),
        text(adjustment.reason),
        { value: adjustment.amount },
      ],
    })),
    totals: [
      null,
      null,
      null,
      null,
      sumDecimals(rows.map(({ adjustment }) => ZERO.plus(adjustment.amount))).toString(),
    ],
  };
}

/** What each booked entry has had paid, is safe in escrow, or is still owed. */
export function receivablesDrill(
  entries: readonly RevenueEntryRecord[],
  months: readonly MonthKey[],
): DrillTable {
  const rows = bookedIn(entries, months).map((entry) => ({ entry, figures: figuresOf(entry) }));
  const total = (pick: (figures: ReturnType<typeof figuresOf>) => Decimal) =>
    sumDecimals(rows.map((row) => pick(row.figures))).toString();
  return {
    title: 'Receivables',
    columns: [
      { key: 'month', label: 'Booked', format: CELL_FORMAT.MONTH },
      { key: 'client', label: 'Client', format: CELL_FORMAT.TEXT },
      { key: 'net', label: 'Net booked', format: CELL_FORMAT.MONEY, hideOnPhone: true },
      { key: 'received', label: 'Received', format: CELL_FORMAT.MONEY, hideOnPhone: true },
      { key: 'escrow', label: 'Escrow', format: CELL_FORMAT.MONEY, hideOnPhone: true },
      { key: 'outstanding', label: 'Outstanding', format: CELL_FORMAT.MONEY },
    ],
    rows: rows.map(({ entry, figures }) => ({
      id: entry.id,
      href: monthHref(ROUTES.REVENUE, entry.bookingMonth),
      cells: [
        text(entry.bookingMonth),
        text(clientLabel(entry)),
        money(figures.net),
        money(figures.received),
        money(figures.fundedEscrow),
        money(figures.outstanding),
      ],
    })),
    totals: [
      null,
      null,
      total((figures) => figures.net),
      total((figures) => figures.received),
      total((figures) => figures.fundedEscrow),
      total((figures) => figures.outstanding),
    ],
  };
}

export type ExpenseFilter = { line?: PnlLine; funding?: FundingSource };

/**
 * Expense lines behind an expense figure, converted at each month's rate so the total
 * matches the report. Lines that can't be converted (no rate) are listed but not totalled.
 */
export function expensesDrill(
  expenses: readonly ExpenseRecord[],
  pnlLineOf: (categoryId: string) => PnlLine | undefined,
  filter: ExpenseFilter,
  toReporting: (expense: ExpenseRecord) => Decimal | null,
): DrillTable {
  const rows = expenses
    .filter((expense) => !filter.funding || expense.fundingSource === filter.funding)
    .filter((expense) => !filter.line || pnlLineOf(expense.categoryId) === filter.line)
    .map((expense) => ({ expense, reporting: toReporting(expense) }));
  const scope = [
    filter.line ? PNL_LINE_LABEL[filter.line] : 'All expenses',
    filter.funding ? `${FUNDING_SOURCE_LABEL[filter.funding].toLowerCase()} funded` : null,
  ]
    .filter(Boolean)
    .join(', ');
  return {
    title: scope,
    columns: [
      { key: 'date', label: 'Date', format: CELL_FORMAT.DATE },
      { key: 'item', label: 'Item', format: CELL_FORMAT.TEXT },
      { key: 'category', label: 'Category', format: CELL_FORMAT.TEXT, hideOnPhone: true },
      { key: 'amount', label: 'Amount', format: CELL_FORMAT.MONEY, hideOnPhone: true },
      { key: 'reporting', label: 'In report currency', format: CELL_FORMAT.MONEY },
    ],
    rows: rows.map(({ expense, reporting }) => ({
      id: expense.id,
      href: monthHref(ROUTES.EXPENSES, expense.month),
      cells: [
        text(expense.expenseDate),
        text(expense.item),
        text(expense.categoryName),
        { value: expense.amount, currency: expense.currency },
        money(reporting),
      ],
    })),
    totals: [
      null,
      null,
      null,
      null,
      sumDecimals(rows.flatMap(({ reporting }) => (reporting ? [reporting] : []))).toString(),
    ],
  };
}
