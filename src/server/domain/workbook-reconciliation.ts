import { Decimal } from '@/lib/decimal';
import { computeMonthlyPnl } from '@/server/domain/pnl';
import {
  WORKBOOK_MONTHS,
  WORKBOOK_PARTNERS,
  type WorkbookMonth,
  workbookMonthToPnlInput,
} from '@/server/domain/workbook-fixture';

/** Excel keeps ~15 significant digits; anything closer than this is the same figure. */
const MATCH_TOLERANCE = new Decimal('0.000001');

export const RECONCILIATION_METRIC = {
  NET_REVENUE: 'Net revenue',
  COMPANY_EXPENSE: 'Company expense',
  NET_PROFIT: 'Net profit (company)',
  TAKE_HOME: 'Take-home',
} as const;
type ReconciliationMetric = (typeof RECONCILIATION_METRIC)[keyof typeof RECONCILIATION_METRIC];

type KnownDeviation = { metrics: readonly ReconciliationMetric[]; reason: string };

/**
 * Where a month tab breaks the workbook's own rules, the app follows PRD §6 instead.
 * Each entry names the tab, the figures that differ by design, and why.
 */
export const KNOWN_WORKBOOK_DEVIATIONS: Readonly<Record<string, KnownDeviation>> = {
  'Mar 2026': {
    metrics: [RECONCILIATION_METRIC.TAKE_HOME],
    reason:
      'The tab takes the 5% reserve of each partner’s own share; PRD §6 takes it of total distributable profit.',
  },
  'Jun 2026': {
    metrics: [
      RECONCILIATION_METRIC.COMPANY_EXPENSE,
      RECONCILIATION_METRIC.NET_PROFIT,
      RECONCILIATION_METRIC.TAKE_HOME,
    ],
    reason:
      'The tab’s Total Company Expense formula sums Operations Overhead rows 44–50 and misses rows 51–52 ' +
      '(LLC Re-new $120, MultiLogin $7). The app counts every line, so company expense is $127 higher.',
  },
};

export type ReconciliationRow = {
  tab: string;
  metric: string;
  workbook: Decimal;
  app: Decimal;
  matches: boolean;
  expectedDeviation: boolean;
};

function isKnownDeviation(tab: string, metric: ReconciliationMetric): boolean {
  return KNOWN_WORKBOOK_DEVIATIONS[tab]?.metrics.includes(metric) ?? false;
}

function compare(
  tab: string,
  metric: ReconciliationMetric,
  workbook: number | null,
  app: Decimal,
  label: string = metric,
): ReconciliationRow {
  const workbookValue = new Decimal(workbook ?? 0);
  return {
    tab,
    metric: label,
    workbook: workbookValue,
    app,
    matches: workbookValue.minus(app).abs().lessThanOrEqualTo(MATCH_TOLERANCE),
    expectedDeviation: isKnownDeviation(tab, metric),
  };
}

export function reconcileMonth(month: WorkbookMonth): ReconciliationRow[] {
  const pnl = computeMonthlyPnl(workbookMonthToPnlInput(month));
  const totals = month.workbook;
  const rows = [
    compare(month.tab, RECONCILIATION_METRIC.NET_REVENUE, totals.netRevenue, pnl.netRevenue),
    compare(
      month.tab,
      RECONCILIATION_METRIC.COMPANY_EXPENSE,
      totals.companyExpense,
      pnl.totalCompanyExpense,
    ),
    compare(
      month.tab,
      RECONCILIATION_METRIC.NET_PROFIT,
      totals.netProfitCompany,
      pnl.netProfitCompany,
    ),
  ];
  for (const partner of WORKBOOK_PARTNERS) {
    const share = pnl.distribution?.partners.find((candidate) => candidate.partnerId === partner);
    rows.push(
      compare(
        month.tab,
        RECONCILIATION_METRIC.TAKE_HOME,
        totals.takeHome[partner],
        share?.takeHome ?? new Decimal(0),
        `${RECONCILIATION_METRIC.TAKE_HOME} — ${partner}`,
      ),
    );
  }
  return rows;
}

export function reconcileWorkbook(): ReconciliationRow[] {
  return WORKBOOK_MONTHS.flatMap(reconcileMonth);
}
