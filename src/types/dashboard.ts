import type { DecimalString } from '@/lib/decimal';
import type { ChartDatum } from '@/types/charts';

/** Net revenue, company expense, net profit and margin for one period. */
export type PeriodGlance = {
  label: string;
  periodParam: string;
  netRevenue: DecimalString;
  companyExpense: DecimalString;
  netProfit: DecimalString;
  margin: DecimalString | null;
  /** Months the period covers that could not be computed for want of a rate. */
  missingMonths: number;
};

/** PRD §5.7 dashboard: this month and quarter at a glance, cash in hand and receivables. */
export type DashboardView = {
  currency: string;
  month: PeriodGlance;
  quarter: PeriodGlance;
  /** Company cash now: typed closing balances where entered, expected otherwise. */
  cashInHand: DecimalString | null;
  outstanding: DecimalString;
  unfunded: DecimalString;
  collectionRate: DecimalString | null;
  year: { label: string; periodParam: string; chart: ChartDatum[] };
};
