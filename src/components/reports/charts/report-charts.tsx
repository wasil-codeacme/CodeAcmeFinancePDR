'use client';

import { ChartCard } from '@/components/reports/charts/chart-card';
import { MarginLine, PeriodBars, RankedBars } from '@/components/reports/charts/lazy-charts';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SEARCH_PARAM } from '@/lib/constants';
import { formatRatioAsPercent } from '@/lib/format';
import { ROUTES, withSearchParams } from '@/lib/routes';
import type { ChartsView } from '@/types/charts';
import { DRILL_FIGURE } from '@/types/report';

const PROFIT_SERIES = [
  { key: 'revenue', label: 'Net revenue' },
  { key: 'expenses', label: 'Company expense' },
  { key: 'profit', label: 'Net profit' },
];

/** Collection rate per bucket, as text beside the chart (one axis per chart, never two). */
function collectionSummary(view: ChartsView): string {
  const rates = view.receivables.data.map((datum) => {
    const rate = typeof datum.collectionRate === 'number' ? datum.collectionRate : null;
    return `${datum.label} ${formatRatioAsPercent(rate)}`;
  });
  return `Collection rate: ${rates.join(' · ')}.`;
}

/** PRD §5.7 quarterly charts, all for the period chosen above. */
export function ReportCharts({ view }: { view: ChartsView }) {
  const withPeriod = (path: string, extra: Record<string, string> = {}) =>
    withSearchParams(path, { [SEARCH_PARAM.PERIOD]: view.periodParam, ...extra });
  const revenueEntries = withPeriod(ROUTES.REPORTS.ENTRIES, {
    [SEARCH_PARAM.FIGURE]: DRILL_FIGURE.REVENUE,
  });
  return (
    <div className="grid gap-4">
      {view.warnings.map((warning) => (
        <Alert key={warning}>
          <AlertDescription>{warning}</AlertDescription>
        </Alert>
      ))}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Revenue, expenses and profit"
          description="Net revenue, company-funded expense and net profit (company)."
          tableHref={withPeriod(ROUTES.REPORTS.PNL)}
        >
          <PeriodBars data={view.profit} series={PROFIT_SERIES} currency={view.currency} />
        </ChartCard>
        <ChartCard
          title="Margin trend"
          description="Net profit ÷ net revenue, month by month."
          tableHref={withPeriod(ROUTES.REPORTS.PNL)}
        >
          <MarginLine data={view.margin} />
        </ChartCard>
        <ChartCard
          title="Expense mix"
          description="Company-funded expense by P&L line."
          tableHref={withPeriod(ROUTES.REPORTS.PNL)}
        >
          <PeriodBars
            data={view.expenseMix.data}
            series={view.expenseMix.series}
            currency={view.currency}
            stacked
          />
        </ChartCard>
        <ChartCard
          title="Receivables and collection"
          description={`What became of the work booked in each period. ${collectionSummary(view)}`}
          tableHref={withPeriod(ROUTES.REPORTS.RECEIVABLES)}
        >
          <PeriodBars
            data={view.receivables.data}
            series={view.receivables.series}
            currency={view.currency}
            stacked
          />
        </ChartCard>
        <ChartCard
          title="Revenue by platform"
          description="Net revenue booked in the period."
          tableHref={revenueEntries}
        >
          <RankedBars data={view.revenueByPlatform} currency={view.currency} />
        </ChartCard>
        <ChartCard
          title="Revenue by client"
          description="Net revenue booked in the period; smaller clients grouped as Other."
          tableHref={revenueEntries}
        >
          <RankedBars data={view.revenueByClient} currency={view.currency} />
        </ChartCard>
        <ChartCard
          title="Cash by account"
          description="Closing balance of each account at month end, in the report currency."
          tableHref={withPeriod(ROUTES.REPORTS.CASH)}
        >
          <PeriodBars
            data={view.cashByAccount.data}
            series={view.cashByAccount.series}
            currency={view.currency}
            stacked
          />
        </ChartCard>
      </div>
    </div>
  );
}
