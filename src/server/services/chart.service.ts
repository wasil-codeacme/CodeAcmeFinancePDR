import { PERMISSION, hasPermission } from '@/lib/permissions';
import {
  type ReportPeriod,
  displayColumns,
  formatPeriodLabel,
  periodMonths,
  shortMonthLabel,
  toPeriodParam,
} from '@/lib/report-period';
import { sumPnls } from '@/server/domain/period-report';
import { figuresOf } from '@/server/domain/revenue-view';
import { ForbiddenError, NotFoundError } from '@/server/errors';
import { loadCashMonths } from '@/server/read-models/account-timelines';
import { loadBookedEntries, loadMonthlyPnls } from '@/server/read-models/report-data';
import { companyRepository } from '@/server/repositories/company.repository';
import {
  RECEIVABLE_SERIES,
  cashChart,
  expenseMixChart,
  marginChart,
  profitChart,
  rankWithOther,
  receivablesChart,
} from '@/server/reports/charts';
import { missingMonthsWarning, totalsByColumn } from '@/server/reports/pnl-report';
import { receivablesByColumn } from '@/server/reports/receivables-report';
import type { SessionUser } from '@/types/auth';
import type { ChartsView } from '@/types/charts';

/** Seven named bars plus "Other" keeps every chart inside the eight validated colours. */
const NAMED_BARS = 7;
const NO_PLATFORM = 'Direct';

/**
 * PRD §5.7 quarterly charts: revenue, expenses and profit; margin trend; expense mix;
 * revenue by platform and client; receivables and collection; cash by account.
 */
export async function getCharts(
  user: SessionUser,
  period: ReportPeriod,
  now: Date,
): Promise<ChartsView> {
  if (!hasPermission(user.role, PERMISSION.REPORTS_VIEW)) throw new ForbiddenError();
  const months = periodMonths(period, now);
  const columns = displayColumns(period, now);
  const buckets = columns.filter((column) => !column.isTotal);
  const bucketColumns = buckets.length > 0 ? buckets : columns;
  const [company, pnls, entries, { cash, accounts }] = await Promise.all([
    companyRepository.find(),
    loadMonthlyPnls(months, false),
    loadBookedEntries(months),
    loadCashMonths(months),
  ]);
  if (!company) throw new NotFoundError();
  const totals = totalsByColumn(bucketColumns, pnls);
  const booked = entries.map((entry) => ({ entry, figures: figuresOf(entry) }));
  const receivables = receivablesByColumn(
    bucketColumns,
    booked.map(({ entry, figures }) => ({ month: entry.bookingMonth, figures })),
  );
  return {
    periodLabel: formatPeriodLabel(period, now),
    periodParam: toPeriodParam(period),
    currency: company.reportingCurrency,
    profit: profitChart(bucketColumns, totals),
    margin: marginChart(
      months.map((month) => ({
        label: shortMonthLabel(month),
        totals: sumPnls([{ month, pnl: pnls.get(month) ?? null }]),
      })),
    ),
    expenseMix: expenseMixChart(bucketColumns, totals),
    revenueByPlatform: rankWithOther(
      booked.map(({ entry, figures }) => ({
        name: entry.platformName ?? NO_PLATFORM,
        value: figures.net,
      })),
      NAMED_BARS,
    ),
    revenueByClient: rankWithOther(
      booked.map(({ entry, figures }) => ({ name: entry.clientName, value: figures.net })),
      NAMED_BARS,
    ),
    receivables: {
      series: [...RECEIVABLE_SERIES],
      data: receivablesChart(bucketColumns, receivables),
    },
    cashByAccount: cashChart(
      months.map((month) => ({ label: shortMonthLabel(month), cash: cash.get(month) ?? null })),
      accounts,
      NAMED_BARS,
    ),
    warnings: missingMonthsWarning(totals),
  };
}
