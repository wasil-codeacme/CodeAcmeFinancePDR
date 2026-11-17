/** Plain numbers for the chart library; every figure is in the report currency. */
export type ChartSeries = { key: string; label: string };

export type ChartDatum = { label: string } & Record<string, number | string | null>;

export type ChartsView = {
  periodLabel: string;
  periodParam: string;
  currency: string;
  /** Revenue, company expense and net profit per bucket (quarter or month). */
  profit: ChartDatum[];
  /** Margin per month, as a fraction (0.25 = 25 %); null with no revenue. */
  margin: ChartDatum[];
  expenseMix: { series: ChartSeries[]; data: ChartDatum[] };
  revenueByPlatform: ChartDatum[];
  revenueByClient: ChartDatum[];
  receivables: { series: ChartSeries[]; data: ChartDatum[] };
  cashByAccount: { series: ChartSeries[]; data: ChartDatum[] };
  warnings: string[];
};
