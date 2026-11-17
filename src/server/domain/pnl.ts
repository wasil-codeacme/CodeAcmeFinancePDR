import { FundingSource, type PnlLine } from '@/generated/prisma/enums';
import { Decimal, type DecimalString, percentOf, ratioOrNull, sumDecimals } from '@/lib/decimal';
import { PNL_LINE_ORDER } from '@/lib/labels';
import { type CurrencyPair, toReportingCurrency } from '@/server/domain/currency';
import {
  type Distribution,
  type ReserveRule,
  type SplitShare,
  computeDistribution,
} from '@/server/domain/distribution';

export type PnlRevenueLine = { gross: DecimalString; feePercent: DecimalString };

export type PnlExpenseLine = {
  amount: DecimalString;
  currency: string;
  fundingSource: FundingSource;
  categoryId: string;
};

export type PnlCategory = { id: string; name: string; pnlLine: PnlLine; sortOrder: number };

export type MonthlyPnlInput = {
  revenueLines: readonly PnlRevenueLine[];
  adjustmentAmounts: readonly DecimalString[];
  expenseLines: readonly PnlExpenseLine[];
  categories: readonly PnlCategory[];
  currencies: CurrencyPair;
  rate: DecimalString | null;
  shares: readonly SplitShare[] | null;
  reserveRule: ReserveRule | null;
};

export type CategoryExpense = { id: string; name: string; company: Decimal; external: Decimal };

export type PnlLineExpense = {
  pnlLine: PnlLine;
  company: Decimal;
  external: Decimal;
  categories: CategoryExpense[];
};

export type MonthlyPnl = {
  grossRevenue: Decimal;
  platformFees: Decimal;
  netRevenueBooked: Decimal;
  receivableAdjustments: Decimal;
  netRevenue: Decimal;
  expenseLines: PnlLineExpense[];
  totalCompanyExpense: Decimal;
  totalExternalFunding: Decimal;
  grandTotalExpense: Decimal;
  netProfitCompany: Decimal;
  marginCompany: Decimal | null;
  netProfitInclExternal: Decimal;
  marginInclExternal: Decimal | null;
  distribution: Distribution | null;
};

function summarizeRevenue(lines: readonly PnlRevenueLine[]) {
  const grossRevenue = sumDecimals(lines.map((line) => new Decimal(line.gross)));
  const platformFees = sumDecimals(
    lines.map((line) => percentOf(new Decimal(line.gross), line.feePercent)),
  );
  return { grossRevenue, platformFees, netRevenueBooked: grossRevenue.minus(platformFees) };
}

function categoryExpense(
  category: PnlCategory,
  lines: readonly PnlExpenseLine[],
  input: MonthlyPnlInput,
): CategoryExpense {
  const inCategory = lines.filter((line) => line.categoryId === category.id);
  const totalFor = (source: FundingSource) =>
    sumDecimals(
      inCategory
        .filter((line) => line.fundingSource === source)
        .map((line) =>
          toReportingCurrency(line.amount, line.currency, input.rate, input.currencies),
        ),
    );
  return {
    id: category.id,
    name: category.name,
    company: totalFor(FundingSource.COMPANY),
    external: totalFor(FundingSource.EXTERNAL),
  };
}

/** Groups expenses under the fixed P&L lines, each category under the line it maps to. */
function summarizeExpenses(input: MonthlyPnlInput): PnlLineExpense[] {
  const sortedCategories = [...input.categories].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  );
  return PNL_LINE_ORDER.map((pnlLine) => {
    const categories = sortedCategories
      .filter((category) => category.pnlLine === pnlLine)
      .map((category) => categoryExpense(category, input.expenseLines, input));
    return {
      pnlLine,
      company: sumDecimals(categories.map((category) => category.company)),
      external: sumDecimals(categories.map((category) => category.external)),
      categories,
    };
  });
}

/**
 * PRD §6, always filtering by funding source (the Jul–Sep 2026 tabs summed category totals
 * and so counted partner-funded costs as company expense):
 * net profit (company) = net revenue − company-funded expenses; distribution runs on it.
 */
export function computeMonthlyPnl(input: MonthlyPnlInput): MonthlyPnl {
  const revenue = summarizeRevenue(input.revenueLines);
  const receivableAdjustments = sumDecimals(
    input.adjustmentAmounts.map((amount) => new Decimal(amount)),
  );
  const netRevenue = revenue.netRevenueBooked.minus(receivableAdjustments);
  const expenseLines = summarizeExpenses(input);
  const totalCompanyExpense = sumDecimals(expenseLines.map((line) => line.company));
  const totalExternalFunding = sumDecimals(expenseLines.map((line) => line.external));
  const netProfitCompany = netRevenue.minus(totalCompanyExpense);
  const netProfitInclExternal = netProfitCompany.minus(totalExternalFunding);
  const distribution = input.shares
    ? computeDistribution({
        distributableProfit: netProfitCompany,
        shares: input.shares,
        reserveRule: input.reserveRule,
        rate: input.rate,
      })
    : null;
  return {
    ...revenue,
    receivableAdjustments,
    netRevenue,
    expenseLines,
    totalCompanyExpense,
    totalExternalFunding,
    grandTotalExpense: totalCompanyExpense.plus(totalExternalFunding),
    netProfitCompany,
    marginCompany: ratioOrNull(netProfitCompany, netRevenue),
    netProfitInclExternal,
    marginInclExternal: ratioOrNull(netProfitInclExternal, netRevenue),
    distribution,
  };
}
