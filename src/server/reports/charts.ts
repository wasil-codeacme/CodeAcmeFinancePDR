import { Decimal, ZERO } from '@/lib/decimal';
import { PNL_LINE_LABEL, PNL_LINE_ORDER } from '@/lib/labels';
import type { ReportColumn } from '@/lib/report-period';
import type { CashMonth } from '@/server/domain/cash-position';
import type { PnlTotals } from '@/server/domain/period-report';
import type { ReceivableTotals } from '@/server/domain/revenue-math';
import type { ChartDatum, ChartSeries } from '@/types/charts';

const CENTS = 2;
const OTHER_LABEL = 'Other';

export function toChartNumber(value: Decimal | null): number | null {
  return value === null ? null : value.toDecimalPlaces(CENTS).toNumber();
}

/** Biggest first; past `keep` entries the rest fold into one "Other" bar (fixed colour order). */
export function rankWithOther(
  items: readonly { name: string; value: Decimal }[],
  keep: number,
): { label: string; value: number }[] {
  const totals = new Map<string, Decimal>();
  for (const item of items) totals.set(item.name, (totals.get(item.name) ?? ZERO).plus(item.value));
  const sorted = [...totals.entries()].sort(([, left], [, right]) => right.comparedTo(left));
  const kept = sorted.slice(0, keep).map(([label, value]) => ({ label, value: value.toNumber() }));
  const rest = sorted.slice(keep).reduce((total, [, value]) => total.plus(value), new Decimal(0));
  return rest.isZero() ? kept : [...kept, { label: OTHER_LABEL, value: rest.toNumber() }];
}

/** Revenue, company expense and net profit per bucket — the quarterly chart of PRD §5.7. */
export function profitChart(
  columns: readonly ReportColumn[],
  totals: readonly PnlTotals[],
): ChartDatum[] {
  return columns.map((column, index) => ({
    label: column.label,
    revenue: toChartNumber(totals[index]?.netRevenue ?? null),
    expenses: toChartNumber(totals[index]?.totalCompanyExpense ?? null),
    profit: toChartNumber(totals[index]?.netProfitCompany ?? null),
  }));
}

export function marginChart(months: readonly { label: string; totals: PnlTotals }[]): ChartDatum[] {
  return months.map(({ label, totals }) => ({
    label,
    margin: totals.marginCompany ? totals.marginCompany.toDecimalPlaces(4).toNumber() : null,
  }));
}

/** Company-funded spend by P&L line per bucket (the expense mix). */
export function expenseMixChart(
  columns: readonly ReportColumn[],
  totals: readonly PnlTotals[],
): { series: ChartSeries[]; data: ChartDatum[] } {
  return {
    series: PNL_LINE_ORDER.map((pnlLine) => ({ key: pnlLine, label: PNL_LINE_LABEL[pnlLine] })),
    data: columns.map((column, index) => ({
      label: column.label,
      ...Object.fromEntries(
        PNL_LINE_ORDER.map((pnlLine) => [
          pnlLine,
          toChartNumber(
            totals[index]?.lines.find((line) => line.pnlLine === pnlLine)?.company ?? ZERO,
          ),
        ]),
      ),
    })),
  };
}

export const RECEIVABLE_SERIES: readonly ChartSeries[] = [
  { key: 'received', label: 'Received' },
  { key: 'escrow', label: 'Funded escrow' },
  { key: 'unfunded', label: 'Unfunded (at risk)' },
  { key: 'writtenOff', label: 'Written off' },
];

/** What happened to the work booked in each bucket; collection rate rides along for the label. */
export function receivablesChart(
  columns: readonly ReportColumn[],
  totals: readonly ReceivableTotals[],
): ChartDatum[] {
  return columns.map((column, index) => {
    const total = totals[index];
    return {
      label: column.label,
      received: toChartNumber(total?.received ?? null),
      escrow: toChartNumber(total?.fundedEscrow ?? null),
      unfunded: toChartNumber(total?.unfunded ?? null),
      writtenOff: toChartNumber(total?.writtenOff ?? null),
      collectionRate: total?.collectionRate
        ? total.collectionRate.toDecimalPlaces(4).toNumber()
        : null,
    };
  });
}

/** Closing cash per account at each month end; past `keep` accounts the rest are "Other". */
export function cashChart(
  months: readonly { label: string; cash: CashMonth | null }[],
  accounts: readonly { accountId: string; name: string }[],
  keep: number,
): { series: ChartSeries[]; data: ChartDatum[] } {
  const shown = accounts.slice(0, keep);
  const hasOther = accounts.length > keep;
  const series = [
    ...shown.map((account) => ({ key: account.accountId, label: account.name })),
    ...(hasOther ? [{ key: 'other', label: OTHER_LABEL }] : []),
  ];
  const data = months.map(({ label, cash }) => {
    const closing = (accountId: string) =>
      cash?.accounts.find((account) => account.accountId === accountId)?.closing ?? ZERO;
    const other = accounts
      .slice(keep)
      .reduce((total, account) => total.plus(closing(account.accountId)), new Decimal(0));
    return {
      label,
      ...Object.fromEntries(
        shown.map((account) => [
          account.accountId,
          cash ? toChartNumber(closing(account.accountId)) : null,
        ]),
      ),
      ...(hasOther ? { other: cash ? toChartNumber(other) : null } : {}),
    };
  });
  return { series, data };
}
