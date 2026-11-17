import type { MonthKey } from '@/lib/month';
import { PERMISSION, hasPermission } from '@/lib/permissions';
import {
  PERIOD_KIND,
  type ReportPeriod,
  displayColumns,
  formatPeriodLabel,
  periodMonths,
  toPeriodParam,
  withKind,
} from '@/lib/report-period';
import { type PnlTotals, sumPnls } from '@/server/domain/period-report';
import type { MonthlyPnl } from '@/server/domain/pnl';
import { summarizeReceivables } from '@/server/domain/revenue-math';
import { ForbiddenError, NotFoundError } from '@/server/errors';
import { loadCashMonths } from '@/server/read-models/account-timelines';
import { loadBookedFigures, loadMonthlyPnls } from '@/server/read-models/report-data';
import { companyRepository } from '@/server/repositories/company.repository';
import { profitChart } from '@/server/reports/charts';
import { totalsByColumn } from '@/server/reports/pnl-report';
import type { SessionUser } from '@/types/auth';
import type { DashboardView, PeriodGlance } from '@/types/dashboard';

function glance(
  period: ReportPeriod,
  now: Date,
  pnls: ReadonlyMap<MonthKey, MonthlyPnl | null>,
): PeriodGlance {
  const totals: PnlTotals = sumPnls(
    periodMonths(period, now).map((month) => ({ month, pnl: pnls.get(month) ?? null })),
  );
  return {
    label: formatPeriodLabel(period, now),
    periodParam: toPeriodParam(period),
    netRevenue: totals.netRevenue.toString(),
    companyExpense: totals.totalCompanyExpense.toString(),
    netProfit: totals.netProfitCompany.toString(),
    margin: totals.marginCompany?.toString() ?? null,
    missingMonths: totals.missingMonths.length,
  };
}

export async function getDashboard(user: SessionUser, now: Date): Promise<DashboardView> {
  if (!hasPermission(user.role, PERMISSION.REPORTS_VIEW)) throw new ForbiddenError();
  const year: ReportPeriod = { kind: PERIOD_KIND.YTD, year: now.getUTCFullYear() };
  const month = withKind(year, PERIOD_KIND.MONTH, now);
  const quarter = withKind(year, PERIOD_KIND.QUARTER, now);
  const yearMonths = periodMonths(year, now);
  const currentMonth = yearMonths.at(-1);
  const [company, pnls, booked, { cash }] = await Promise.all([
    companyRepository.find(),
    loadMonthlyPnls(yearMonths, false),
    loadBookedFigures(null),
    loadCashMonths(currentMonth ? [currentMonth] : []),
  ]);
  if (!company) throw new NotFoundError();
  const receivables = summarizeReceivables(booked.map((entry) => entry.figures));
  const quarters = displayColumns(year, now).filter((column) => !column.isTotal);
  return {
    currency: company.reportingCurrency,
    month: glance(month, now, pnls),
    quarter: glance(quarter, now, pnls),
    cashInHand: currentMonth ? (cash.get(currentMonth)?.companyCash.toString() ?? null) : null,
    outstanding: receivables.outstanding.toString(),
    unfunded: receivables.unfunded.toString(),
    collectionRate: receivables.collectionRate?.toString() ?? null,
    year: {
      label: formatPeriodLabel(year, now),
      periodParam: toPeriodParam(year),
      chart: profitChart(quarters, totalsByColumn(quarters, pnls)),
    },
  };
}
