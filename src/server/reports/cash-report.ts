import { Decimal, ZERO, sumDecimals } from '@/lib/decimal';
import { type MonthKey, addMonths, formatMonthLabel } from '@/lib/month';
import type { ReportColumn } from '@/lib/report-period';
import { type CashMonth, netCashFlow } from '@/server/domain/cash-position';
import { hasFigures, moneyRow } from '@/server/reports/report-rows';
import { ROW_TONE, type ReportSection } from '@/types/report';

type CashInput = {
  columns: readonly ReportColumn[];
  /** Every month of the period plus the month before it (for the opening figure). */
  cash: ReadonlyMap<MonthKey, CashMonth | null>;
  accounts: readonly { accountId: string; name: string }[];
  /** Partner withdrawals and funding reveal take-home, so only founders see them apart. */
  showPartnerMovements: boolean;
};

type ColumnCash = {
  opening: Decimal | null;
  months: CashMonth[];
  last: CashMonth | null;
};

function columnCash(column: ReportColumn, cash: CashInput['cash']): ColumnCash | null {
  const months = column.months.map((month) => cash.get(month) ?? null);
  if (months.some((month) => month === null)) return null;
  const present = months.flatMap((month) => (month ? [month] : []));
  const first = column.months[0];
  const opening = first ? (cash.get(addMonths(first, -1))?.companyCash ?? null) : null;
  return { opening, months: present, last: present.at(-1) ?? null };
}

export function missingCashWarning(input: Pick<CashInput, 'columns' | 'cash'>): string[] {
  const missing = [...new Set(input.columns.flatMap((column) => column.months))].filter(
    (month) => input.cash.get(month) === null,
  );
  return missing.length === 0
    ? []
    : [
        `Cash can't be converted without an exchange rate for ${missing.map(formatMonthLabel).join(', ')}.`,
      ];
}

/**
 * The Dashboard tab's running cash balance and cash reconciliation: money in and out of
 * the company's accounts, closing cash per account, and the gap between what the books
 * expect and the balances typed in at month end.
 */
export function buildCashSections(input: CashInput): ReportSection[] {
  const columns = input.columns.map((column) => columnCash(column, input.cash));
  const flow = (read: (month: CashMonth) => Decimal) =>
    columns.map((column) => (column ? sumDecimals(column.months.map(read)) : null));
  const atEnd = (read: (month: CashMonth) => Decimal | null) =>
    columns.map((column) => (column?.last ? read(column.last) : null));
  const partnerRows = input.showPartnerMovements
    ? [
        moneyRow(
          'funding-in',
          'Partner funding in',
          flow((month) => month.fundingIn),
        ),
        moneyRow(
          'withdrawals',
          'Partner withdrawals',
          flow((month) => month.withdrawals.negated()),
        ),
      ]
    : [
        moneyRow(
          'partner-movements',
          'Partner movements (net)',
          flow((month) => month.fundingIn.minus(month.withdrawals)),
        ),
      ];
  const transfers = moneyRow(
    'transfers',
    'Transfer fees and currency differences',
    flow((month) => month.transfersNet),
    { tone: ROW_TONE.MUTED },
  );
  return [
    {
      key: 'flow',
      title: 'Cash flow',
      rows: [
        moneyRow(
          'opening',
          'Opening cash',
          columns.map((column) => column?.opening ?? null),
          {
            tone: ROW_TONE.MUTED,
          },
        ),
        moneyRow(
          'received',
          'Received from clients',
          flow((month) => month.received),
        ),
        moneyRow(
          'paid-out',
          'Expenses paid',
          flow((month) => month.paidOut.negated()),
        ),
        ...partnerRows.filter(hasFigures),
        ...(hasFigures(transfers) ? [transfers] : []),
        moneyRow('net-flow', 'Net cash flow', flow(netCashFlow), { tone: ROW_TONE.SUBTOTAL }),
      ],
    },
    {
      key: 'balances',
      title: 'Closing balances',
      note: 'At the end of each period, in the reporting currency. Typed-in balances where entered, otherwise expected.',
      rows: [
        ...input.accounts.map((account) =>
          moneyRow(
            `account-${account.accountId}`,
            account.name,
            atEnd(
              (month) =>
                month.accounts.find((candidate) => candidate.accountId === account.accountId)
                  ?.closing ?? ZERO,
            ),
          ),
        ),
        moneyRow(
          'company-cash',
          'Company cash',
          atEnd((month) => month.companyCash),
          {
            tone: ROW_TONE.TOTAL,
          },
        ),
        moneyRow(
          'expected-cash',
          'Expected from movements',
          atEnd((month) => month.expectedCash),
          {
            tone: ROW_TONE.MUTED,
          },
        ),
        moneyRow(
          'difference',
          'Difference (typed − expected)',
          atEnd((month) => month.difference ?? new Decimal(0)),
          { tone: ROW_TONE.MUTED },
        ),
      ],
    },
  ];
}
