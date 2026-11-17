import { FundingSource } from '@/generated/prisma/enums';
import { Decimal, type DecimalString } from '@/lib/decimal';
import type { MonthKey } from '@/lib/month';
import { toReportingCurrency } from '@/server/domain/currency';
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

export type ReadyPnl = {
  kind: typeof PNL_RESULT.READY;
  pnl: MonthlyPnl;
  rate: { value: DecimalString; month: MonthKey } | null;
  currencies: { reporting: string; display: string };
  hasSplit: boolean;
  /** External funding per partner this month (reporting currency), for the close postings. */
  fundedByPartnerId: Record<string, Decimal>;
  closedAt: Date | null;
};

export type MonthlyPnlResult =
  ReadyPnl | { kind: typeof PNL_RESULT.MISSING_RATE } | { kind: typeof PNL_RESULT.NOT_SET_UP };

function fundedByPartner(
  lines: readonly {
    amount: string;
    currency: string;
    fundingSource: FundingSource;
    fundingPartnerId: string | null;
  }[],
  rate: DecimalString | null,
  currencies: { reporting: string; display: string },
): Record<string, Decimal> {
  const funded: Record<string, Decimal> = {};
  for (const line of lines) {
    if (line.fundingSource !== FundingSource.EXTERNAL || !line.fundingPartnerId) continue;
    const amount = toReportingCurrency(line.amount, line.currency, rate, currencies);
    funded[line.fundingPartnerId] = (funded[line.fundingPartnerId] ?? new Decimal(0)).plus(amount);
  }
  return funded;
}

/**
 * The live monthly P&L from confirmed entries (PRD §6). Shared by the P&L report and the
 * month close so both compute exactly the same figures. The distribution is computed only
 * when the caller may see it, so founder-only figures never leave the server otherwise.
 */
export async function loadMonthlyPnl(
  month: MonthKey,
  options: { includeDistribution: boolean },
): Promise<MonthlyPnlResult> {
  const [company, revenueLines, adjustments, expenseLines, categories, rate, splits, rules] =
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
  const rateValue = rate?.rate ?? null;
  try {
    const pnl = computeMonthlyPnl({
      revenueLines,
      adjustmentAmounts: adjustments,
      expenseLines,
      categories,
      currencies,
      rate: rateValue,
      shares: options.includeDistribution && split ? split.shares : null,
      reserveRule: pickEffectiveVersion(rules, month),
    });
    return {
      kind: PNL_RESULT.READY,
      pnl,
      rate: rate ? { value: rate.rate, month: rate.month } : null,
      currencies,
      hasSplit: split !== null,
      fundedByPartnerId: fundedByPartner(expenseLines, rateValue, currencies),
      closedAt: null,
    };
  } catch (error) {
    if (error instanceof MissingExchangeRateError) return { kind: PNL_RESULT.MISSING_RATE };
    throw error;
  }
}
