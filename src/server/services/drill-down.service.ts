import { Decimal } from '@/lib/decimal';
import { PERMISSION, hasPermission } from '@/lib/permissions';
import { type ReportPeriod, formatPeriodLabel, periodMonths } from '@/lib/report-period';
import { toReportingCurrency } from '@/server/domain/currency';
import { pickEffectiveVersion } from '@/server/domain/effective-version';
import { ForbiddenError, MissingExchangeRateError, NotFoundError } from '@/server/errors';
import { companyRepository } from '@/server/repositories/company.repository';
import { expenseRepository } from '@/server/repositories/expense.repository';
import { revenueRepository } from '@/server/repositories/revenue.repository';
import {
  exchangeRateRepository,
  expenseCategoryRepository,
} from '@/server/repositories/settings.repository';
import {
  type DrillTable,
  adjustmentsDrill,
  expensesDrill,
  receivablesDrill,
  revenueDrill,
} from '@/server/reports/drill-down';
import type { DrillQuery } from '@/server/validators/report.schema';
import type { SessionUser } from '@/types/auth';
import type { DrillDownView } from '@/types/drill-down';
import { DRILL_FIGURE } from '@/types/report';

async function expenseTable(query: DrillQuery, months: ReturnType<typeof periodMonths>) {
  const [company, expenses, categories, rates] = await Promise.all([
    companyRepository.find(),
    expenseRepository.listConfirmedForMonths(months),
    expenseCategoryRepository.list(),
    exchangeRateRepository.list(),
  ]);
  if (!company) throw new NotFoundError();
  const currencies = { reporting: company.reportingCurrency, display: company.displayCurrency };
  const rateVersions = rates.map((rate) => ({ ...rate, effectiveFrom: rate.month }));
  const lineOf = new Map(categories.map((category) => [category.id, category.pnlLine]));
  return expensesDrill(
    expenses,
    (categoryId) => lineOf.get(categoryId),
    { line: query.line, funding: query.funding },
    (expense) => {
      try {
        const rate = pickEffectiveVersion(rateVersions, expense.month)?.rate ?? null;
        return new Decimal(toReportingCurrency(expense.amount, expense.currency, rate, currencies));
      } catch (error) {
        if (error instanceof MissingExchangeRateError) return null;
        throw error;
      }
    },
  );
}

/**
 * PRD §5.7 "click any number to see the entries behind it". Closed months list their
 * entries as they stand; closed entries are read-only, so they still add up to the snapshot.
 */
export async function getDrillDown(
  user: SessionUser,
  period: ReportPeriod,
  query: DrillQuery,
  now: Date,
): Promise<DrillDownView> {
  if (!hasPermission(user.role, PERMISSION.REPORTS_VIEW)) throw new ForbiddenError();
  const months = periodMonths(period, now);
  const company = await companyRepository.find();
  if (!company) throw new NotFoundError();
  let table: DrillTable;
  if (query.figure === DRILL_FIGURE.EXPENSES) {
    table = await expenseTable(query, months);
  } else {
    const entries = await revenueRepository.listConfirmed();
    const build = {
      [DRILL_FIGURE.REVENUE]: revenueDrill,
      [DRILL_FIGURE.ADJUSTMENTS]: adjustmentsDrill,
      [DRILL_FIGURE.RECEIVABLES]: receivablesDrill,
    }[query.figure];
    table = build(entries, months);
  }
  return {
    ...table,
    periodLabel: formatPeriodLabel(period, now),
    currency: company.reportingCurrency,
  };
}
