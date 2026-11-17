import { FundingSource, PeriodStatus } from '@/generated/prisma/enums';
import { Decimal, type DecimalString } from '@/lib/decimal';
import { type MonthKey, isMonthKey } from '@/lib/month';
import { toReportingCurrency } from '@/server/domain/currency';
import { pickEffectiveVersion } from '@/server/domain/effective-version';
import { type MonthlyPnl, computeMonthlyPnl } from '@/server/domain/pnl';
import { parseClosedPeriodSnapshot } from '@/server/domain/pnl-snapshot';
import { MissingExchangeRateError } from '@/server/errors';
import { companyRepository } from '@/server/repositories/company.repository';
import { expenseRepository } from '@/server/repositories/expense.repository';
import { periodRepository } from '@/server/repositories/period.repository';
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

type MonthGroup<TItem extends { month: MonthKey }> = Map<MonthKey, TItem[]>;

function groupByMonth<TItem extends { month: MonthKey }>(
  items: readonly TItem[],
): MonthGroup<TItem> {
  const groups: MonthGroup<TItem> = new Map();
  for (const item of items) groups.set(item.month, [...(groups.get(item.month) ?? []), item]);
  return groups;
}

/**
 * The live P&L of each month from confirmed entries (PRD §6), loaded with one query per table
 * however many months are asked for. The P&L page, the month close and the reports all go
 * through here, so they compute exactly the same figures. The distribution is computed only
 * when the caller may see it, so founder-only figures never leave the server otherwise.
 */
export async function loadPnlRange(
  months: readonly MonthKey[],
  options: { includeDistribution: boolean },
): Promise<Map<MonthKey, MonthlyPnlResult>> {
  const [company, revenue, adjustments, expenses, categories, rates, splits, rules] =
    await Promise.all([
      companyRepository.find(),
      revenueRepository.pnlRevenueForMonths(months),
      revenueRepository.pnlAdjustmentsForMonths(months),
      expenseRepository.pnlExpensesForMonths(months),
      expenseCategoryRepository.list(),
      exchangeRateRepository.list(),
      options.includeDistribution ? splitVersionRepository.list() : Promise.resolve([]),
      options.includeDistribution ? reserveRuleRepository.list() : Promise.resolve([]),
    ]);
  const results = new Map<MonthKey, MonthlyPnlResult>();
  if (!company) {
    for (const month of months) results.set(month, { kind: PNL_RESULT.NOT_SET_UP });
    return results;
  }
  const currencies = { reporting: company.reportingCurrency, display: company.displayCurrency };
  const rateVersions = rates.map((rate) => ({ ...rate, effectiveFrom: rate.month }));
  const revenueByMonth = groupByMonth(revenue);
  const adjustmentsByMonth = groupByMonth(adjustments);
  const expensesByMonth = groupByMonth(expenses);
  for (const month of months) {
    const split = pickEffectiveVersion(splits, month);
    const rate = pickEffectiveVersion(rateVersions, month);
    const rateValue = rate?.rate ?? null;
    const expenseLines = expensesByMonth.get(month) ?? [];
    try {
      const pnl = computeMonthlyPnl({
        revenueLines: revenueByMonth.get(month) ?? [],
        adjustmentAmounts: (adjustmentsByMonth.get(month) ?? []).map((line) => line.amount),
        expenseLines,
        categories,
        currencies,
        rate: rateValue,
        shares: options.includeDistribution && split ? split.shares : null,
        reserveRule: pickEffectiveVersion(rules, month),
      });
      results.set(month, {
        kind: PNL_RESULT.READY,
        pnl,
        rate: rate ? { value: rate.rate, month: rate.month } : null,
        currencies,
        hasSplit: split !== null,
        fundedByPartnerId: fundedByPartner(expenseLines, rateValue, currencies),
        closedAt: null,
      });
    } catch (error) {
      if (!(error instanceof MissingExchangeRateError)) throw error;
      results.set(month, { kind: PNL_RESULT.MISSING_RATE });
    }
  }
  return results;
}

function notSetUp(): MonthlyPnlResult {
  return { kind: PNL_RESULT.NOT_SET_UP };
}

/** One month's live P&L (the month close posts from this, never from an old snapshot). */
export async function loadMonthlyPnl(
  month: MonthKey,
  options: { includeDistribution: boolean },
): Promise<MonthlyPnlResult> {
  return (await loadPnlRange([month], options)).get(month) ?? notSetUp();
}

/**
 * Each month's P&L as the business should see it: a closed month from the snapshot it was
 * closed with (PRD §5.6), an open month computed live. Founder-only distribution figures are
 * dropped for anyone who may not see them.
 */
export async function readPnlRange(
  months: readonly MonthKey[],
  options: { includeDistribution: boolean },
): Promise<Map<MonthKey, MonthlyPnlResult>> {
  const periods = await periodRepository.listByMonths(months);
  const snapshots = new Map(
    periods.flatMap((period) => {
      const snapshot =
        period.status === PeriodStatus.CLOSED ? parseClosedPeriodSnapshot(period.snapshot) : null;
      return snapshot ? [[period.month, { snapshot, closedAt: period.closedAt }] as const] : [];
    }),
  );
  const live = await loadPnlRange(
    months.filter((month) => !snapshots.has(month)),
    options,
  );
  return new Map(
    months.map((month): [MonthKey, MonthlyPnlResult] => {
      const closed = snapshots.get(month);
      if (!closed) return [month, live.get(month) ?? notSetUp()];
      const { snapshot } = closed;
      return [
        month,
        {
          kind: PNL_RESULT.READY,
          pnl: options.includeDistribution ? snapshot.pnl : { ...snapshot.pnl, distribution: null },
          rate:
            snapshot.rate && isMonthKey(snapshot.rate.month)
              ? { value: snapshot.rate.value, month: snapshot.rate.month }
              : null,
          currencies: snapshot.currencies,
          hasSplit: true,
          fundedByPartnerId: {},
          closedAt: closed.closedAt,
        },
      ];
    }),
  );
}

export async function readMonthlyPnl(
  month: MonthKey,
  options: { includeDistribution: boolean },
): Promise<MonthlyPnlResult> {
  return (await readPnlRange([month], options)).get(month) ?? notSetUp();
}
