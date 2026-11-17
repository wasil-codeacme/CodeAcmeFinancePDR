import { Decimal, type DecimalString, ZERO, percentOf, sumDecimals } from '@/lib/decimal';
import { reportingToDisplay } from '@/server/domain/currency';

export type SplitShare = { partnerId: string; partnerName: string; splitPercent: DecimalString };

export type ReserveRule = {
  enabled: boolean;
  reservePercent: DecimalString;
  appliesInLossMonth: boolean;
};

export type PartnerDistribution = {
  partnerId: string;
  partnerName: string;
  splitPercent: Decimal;
  baselineShare: Decimal;
  reserve: Decimal;
  takeHome: Decimal;
  takeHomeDisplay: Decimal | null;
};

export type Distribution = {
  distributableProfit: Decimal;
  partners: PartnerDistribution[];
  totalReserves: Decimal;
};

type DistributionInput = {
  distributableProfit: Decimal;
  shares: readonly SplitShare[];
  reserveRule: ReserveRule | null;
  rate: DecimalString | null;
};

function reservePercentFor(profit: Decimal, rule: ReserveRule | null): Decimal {
  if (!rule?.enabled) return ZERO;
  if (profit.isNegative() && !rule.appliesInLossMonth) return ZERO;
  return new Decimal(rule.reservePercent);
}

/**
 * PRD §6: baseline share = distributable profit × split %; reserve = distributable profit ×
 * reserve % (of the whole profit, not of the partner's share — the Mar 2026 tab got this
 * wrong); take-home = baseline − reserve; take-home PKR = take-home × the month's rate.
 */
export function computeDistribution(input: DistributionInput): Distribution {
  const reservePercent = reservePercentFor(input.distributableProfit, input.reserveRule);
  const partners = input.shares.map((share) => {
    const baselineShare = percentOf(input.distributableProfit, share.splitPercent);
    const reserve = percentOf(input.distributableProfit, reservePercent);
    const takeHome = baselineShare.minus(reserve);
    return {
      partnerId: share.partnerId,
      partnerName: share.partnerName,
      splitPercent: new Decimal(share.splitPercent),
      baselineShare,
      reserve,
      takeHome,
      takeHomeDisplay: reportingToDisplay(takeHome, input.rate),
    };
  });
  return {
    distributableProfit: input.distributableProfit,
    partners,
    totalReserves: sumDecimals(partners.map((partner) => partner.reserve)),
  };
}
