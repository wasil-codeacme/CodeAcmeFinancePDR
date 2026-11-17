import type { DecimalString } from '@/lib/decimal';
import type { MonthKey } from '@/lib/month';
import { pickEffectiveVersion } from '@/server/domain/effective-version';
import { type MonthlyPnl, computeMonthlyPnl } from '@/server/domain/pnl';
import { MissingExchangeRateError } from '@/server/errors';
import { companyRepository } from '@/server/repositories/company.repository';
import { expenseRepository } from '@/server/repositories/expense.repository';
import {
  reserveRuleRepository,
  splitVersionRepository,
} from '@/server/repositories/profit-sharing.repository';
import { revenueRepository } from '@/server/repositories/revenue.repository';
import {
  exchangeRateRepository,
  expenseCategoryRepository,
} from '@/server/repositories/settings.repository';

export const PNL_RESULT = {
  READY: 'READY',
  MISSING_RATE: 'MISSING_RATE',
  NOT_SET_UP: 'NOT_SET_UP',
} as const;

export type MonthlyPnlResult =
  | {
      kind: typeof PNL_RESULT.READY;
      pnl: MonthlyPnl;
      rate: { value: DecimalString; month: MonthKey } | null;
      currencies: { reporting: string; display: string };
      hasSplit: boolean;
    }
  | { kind: typeof PNL_RESULT.MISSING_RATE }
  | { kind: typeof PNL_RESULT.NOT_SET_UP };

/**
 * The monthly P&L from confirmed entries (PRD §6). The partner distribution is computed
 * only when the caller may see it, so founder-only figures never leave the server otherwise.
 */
export async function getMonthlyPnl(
  month: MonthKey,
  options: { includeDistribution: boolean },
): Promise<MonthlyPnlResult> {
  const [company, revenueLines, adjustments, expenseLines, categories, rate, splits, reserveRules] =
    await Promise.all([
      companyRepository.find(),
      revenueRepository.pnlRevenueForMonth(month),
      revenueRepository.pnlAdjustmentsForMonth(month),
      expenseRepository.pnlExpensesForMonth(month),
      expenseCategoryRepository.list(),
      exchangeRateRepository.findEffective(month),
      options.includeDistribution ? splitVersionRepository.list() : Promise.resolve([]),
      options.includeDistribution ? reserveRuleRepository.list() : Promise.resolve([]),
    ]);
  if (!company) return { kind: PNL_RESULT.NOT_SET_UP };
  const currencies = { reporting: company.reportingCurrency, display: company.displayCurrency };
  const split = pickEffectiveVersion(splits, month);
  try {
    const pnl = computeMonthlyPnl({
      revenueLines,
      adjustmentAmounts: adjustments,
      expenseLines,
      categories,
      currencies,
      rate: rate?.rate ?? null,
      shares: options.includeDistribution && split ? split.shares : null,
      reserveRule: pickEffectiveVersion(reserveRules, month),
    });
    return {
      kind: PNL_RESULT.READY,
      pnl,
      rate: rate ? { value: rate.rate, month: rate.month } : null,
      currencies,
      hasSplit: split !== null,
    };
  } catch (error) {
    if (error instanceof MissingExchangeRateError) return { kind: PNL_RESULT.MISSING_RATE };
    throw error;
  }
}
