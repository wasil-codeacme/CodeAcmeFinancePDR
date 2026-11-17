import { type Decimal, ZERO } from '@/lib/decimal';
import type { MonthKey } from '@/lib/month';
import type { ReportColumn } from '@/lib/report-period';
import {
  type DistributionTotals,
  cumulativeThrough,
  sumDistributions,
} from '@/server/domain/period-report';
import type { MonthlyPnls } from '@/server/reports/pnl-report';
import { moneyRow } from '@/server/reports/report-rows';
import { ROW_TONE, type ReportSection } from '@/types/report';

type DistributionInput = {
  columns: readonly ReportColumn[];
  monthly: MonthlyPnls;
  /** Each month's total reserves since the start of the year, for the running total. */
  reservesByMonth: ReadonlyMap<MonthKey, Decimal>;
  displayCurrency: string;
};

function partnersOf(totals: readonly (DistributionTotals | null)[]) {
  const partners = new Map<string, string>();
  for (const total of totals) {
    for (const partner of total?.partners ?? [])
      partners.set(partner.partnerId, partner.partnerName);
  }
  return [...partners.entries()].map(([partnerId, partnerName]) => ({ partnerId, partnerName }));
}

/**
 * The Dashboard tab's "PARTNER DISTRIBUTION": each partner's baseline share, reserve,
 * take-home and take-home in PKR by month and YTD, total and cumulative reserves.
 * Founders only (PRD §3) — the caller checks before building it.
 */
export function buildDistributionSections(input: DistributionInput): ReportSection[] {
  const totals = input.columns.map((column) =>
    sumDistributions(column.months.map((month) => input.monthly.get(month)?.distribution ?? null)),
  );
  const partnerSections = partnersOf(totals).map(({ partnerId, partnerName }) => {
    const figure = (
      read: (partner: NonNullable<DistributionTotals>['partners'][number]) => Decimal | null,
    ) =>
      totals.map((total) => {
        const partner = total?.partners.find((candidate) => candidate.partnerId === partnerId);
        return partner ? read(partner) : ZERO;
      });
    return {
      key: `partner-${partnerId}`,
      title: partnerName,
      rows: [
        moneyRow(
          `${partnerId}-baseline`,
          'Baseline share',
          figure((partner) => partner.baselineShare),
        ),
        moneyRow(
          `${partnerId}-reserve`,
          'Reserve held back',
          figure((partner) => partner.reserve.negated()),
        ),
        moneyRow(
          `${partnerId}-take-home`,
          'Take-home',
          figure((partner) => partner.takeHome),
          {
            tone: ROW_TONE.SUBTOTAL,
          },
        ),
        moneyRow(
          `${partnerId}-take-home-display`,
          `Take-home in ${input.displayCurrency}`,
          figure((partner) => partner.takeHomeDisplay),
          { tone: ROW_TONE.MUTED, currency: input.displayCurrency },
        ),
      ],
    };
  });
  return [
    {
      key: 'distributable',
      title: 'Distributable profit',
      note: 'Net profit (company), on a booked basis.',
      rows: [
        moneyRow(
          'distributable',
          'Net profit (company)',
          totals.map((total) => total?.distributableProfit ?? ZERO),
          { tone: ROW_TONE.TOTAL },
        ),
      ],
    },
    ...partnerSections,
    {
      key: 'reserves',
      title: 'Reserves',
      note: 'Reserves stay in the company. Cumulative is the running total since January.',
      rows: [
        moneyRow(
          'total-reserves',
          'Total reserves',
          totals.map((total) => total?.totalReserves ?? ZERO),
          {
            tone: ROW_TONE.SUBTOTAL,
          },
        ),
        moneyRow(
          'cumulative-reserves',
          'Cumulative reserves',
          input.columns.map((column) => {
            const last = column.months.at(-1);
            return last ? cumulativeThrough(input.reservesByMonth, last) : ZERO;
          }),
          { tone: ROW_TONE.MUTED },
        ),
      ],
    },
  ];
}
