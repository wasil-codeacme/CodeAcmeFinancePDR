import type { PnlLine } from '@/generated/prisma/enums';
import { Decimal, ZERO, ratioOrNull, sumDecimals } from '@/lib/decimal';
import { PNL_LINE_ORDER } from '@/lib/labels';
import { type MonthKey, compareMonthKeys } from '@/lib/month';
import type { Distribution } from '@/server/domain/distribution';
import type { MonthlyPnl } from '@/server/domain/pnl';

export type PnlLineTotals = { pnlLine: PnlLine; company: Decimal; external: Decimal };

export type PnlTotals = {
  /** Months that went into the totals. */
  months: MonthKey[];
  /** Months of the period that could not be computed (no exchange rate yet). */
  missingMonths: MonthKey[];
  grossRevenue: Decimal;
  platformFees: Decimal;
  netRevenueBooked: Decimal;
  receivableAdjustments: Decimal;
  netRevenue: Decimal;
  lines: PnlLineTotals[];
  totalCompanyExpense: Decimal;
  totalExternalFunding: Decimal;
  netProfitCompany: Decimal;
  marginCompany: Decimal | null;
  netProfitInclExternal: Decimal;
  marginInclExternal: Decimal | null;
};

function total(pnls: readonly MonthlyPnl[], pick: (pnl: MonthlyPnl) => Decimal): Decimal {
  return sumDecimals(pnls.map(pick));
}

function lineTotal(
  pnls: readonly MonthlyPnl[],
  pnlLine: PnlLine,
  source: 'company' | 'external',
): Decimal {
  return sumDecimals(
    pnls.map((pnl) => pnl.expenseLines.find((line) => line.pnlLine === pnlLine)?.[source] ?? ZERO),
  );
}

/**
 * A quarter or year is the sum of its months; margins are recomputed from the sums (the
 * Dashboard tab's YTD margin is YTD profit ÷ YTD net revenue, never an average of months).
 */
export function sumPnls(
  monthly: readonly { month: MonthKey; pnl: MonthlyPnl | null }[],
): PnlTotals {
  const included = monthly.flatMap(({ month, pnl }) => (pnl ? [{ month, pnl }] : []));
  const pnls = included.map((entry) => entry.pnl);
  const netRevenue = total(pnls, (pnl) => pnl.netRevenue);
  const netProfitCompany = total(pnls, (pnl) => pnl.netProfitCompany);
  const netProfitInclExternal = total(pnls, (pnl) => pnl.netProfitInclExternal);
  return {
    months: included.map((entry) => entry.month),
    missingMonths: monthly.filter((entry) => !entry.pnl).map((entry) => entry.month),
    grossRevenue: total(pnls, (pnl) => pnl.grossRevenue),
    platformFees: total(pnls, (pnl) => pnl.platformFees),
    netRevenueBooked: total(pnls, (pnl) => pnl.netRevenueBooked),
    receivableAdjustments: total(pnls, (pnl) => pnl.receivableAdjustments),
    netRevenue,
    lines: PNL_LINE_ORDER.map((pnlLine) => ({
      pnlLine,
      company: lineTotal(pnls, pnlLine, 'company'),
      external: lineTotal(pnls, pnlLine, 'external'),
    })),
    totalCompanyExpense: total(pnls, (pnl) => pnl.totalCompanyExpense),
    totalExternalFunding: total(pnls, (pnl) => pnl.totalExternalFunding),
    netProfitCompany,
    marginCompany: ratioOrNull(netProfitCompany, netRevenue),
    netProfitInclExternal,
    marginInclExternal: ratioOrNull(netProfitInclExternal, netRevenue),
  };
}

export type PartnerTotals = {
  partnerId: string;
  partnerName: string;
  baselineShare: Decimal;
  reserve: Decimal;
  takeHome: Decimal;
  /** Each month's take-home at that month's rate; null if any month had no rate. */
  takeHomeDisplay: Decimal | null;
};

export type DistributionTotals = {
  distributableProfit: Decimal;
  partners: PartnerTotals[];
  totalReserves: Decimal;
};

/** Adds partner figures by partner across months; partners keep the order they first appear in. */
export function sumDistributions(
  distributions: readonly (Distribution | null)[],
): DistributionTotals | null {
  const present = distributions.flatMap((distribution) => (distribution ? [distribution] : []));
  if (present.length === 0) return null;
  const byPartner = new Map<string, PartnerTotals>();
  for (const distribution of present) {
    for (const partner of distribution.partners) {
      const current = byPartner.get(partner.partnerId) ?? {
        partnerId: partner.partnerId,
        partnerName: partner.partnerName,
        baselineShare: ZERO,
        reserve: ZERO,
        takeHome: ZERO,
        takeHomeDisplay: ZERO,
      };
      byPartner.set(partner.partnerId, {
        ...current,
        baselineShare: current.baselineShare.plus(partner.baselineShare),
        reserve: current.reserve.plus(partner.reserve),
        takeHome: current.takeHome.plus(partner.takeHome),
        takeHomeDisplay:
          current.takeHomeDisplay && partner.takeHomeDisplay
            ? current.takeHomeDisplay.plus(partner.takeHomeDisplay)
            : null,
      });
    }
  }
  return {
    distributableProfit: sumDecimals(
      present.map((distribution) => distribution.distributableProfit),
    ),
    partners: [...byPartner.values()],
    totalReserves: sumDecimals(present.map((distribution) => distribution.totalReserves)),
  };
}

/** A running total (cumulative reserves, PRD §6) as it stood at the end of `throughMonth`. */
export function cumulativeThrough(
  values: ReadonlyMap<MonthKey, Decimal>,
  throughMonth: MonthKey,
): Decimal {
  let runningTotal = new Decimal(0);
  for (const [month, value] of values) {
    if (compareMonthKeys(month, throughMonth) <= 0) runningTotal = runningTotal.plus(value);
  }
  return runningTotal;
}
