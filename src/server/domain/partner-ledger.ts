import { LedgerEntryType } from '@/generated/prisma/enums';
import { Decimal, type DecimalString, ZERO } from '@/lib/decimal';
import { type MonthKey, compareMonthKeys } from '@/lib/month';
import type { Distribution } from '@/server/domain/distribution';

export type LedgerEntryInput = { month: MonthKey; type: LedgerEntryType; amount: DecimalString };

export type LedgerMonth = {
  month: MonthKey;
  previousPending: Decimal;
  takeHome: Decimal;
  reserve: Decimal;
  withdrawn: Decimal;
  adjustments: Decimal;
  fundedIn: Decimal;
  pending: Decimal;
  cumulativeReserves: Decimal;
};

/** Partner funding is a record of money put in, not profit the partner may take out. */
const PENDING_TYPES: ReadonlySet<LedgerEntryType> = new Set([
  LedgerEntryType.PROFIT_SHARE,
  LedgerEntryType.RESERVE,
  LedgerEntryType.WITHDRAWAL,
  LedgerEntryType.ADJUSTMENT,
]);

function totalOf(entries: readonly LedgerEntryInput[], type: LedgerEntryType): Decimal {
  return entries
    .filter((entry) => entry.type === type)
    .reduce((total, entry) => total.plus(entry.amount), ZERO);
}

/**
 * One partner's ledger by month. PRD §6: pending to withdraw = previous pending + take-home
 * − withdrawn; it is a running sum, so it carries forward without anyone typing it.
 */
export function summarizeLedger(entries: readonly LedgerEntryInput[]): LedgerMonth[] {
  const months = [...new Set(entries.map((entry) => entry.month))].sort(compareMonthKeys);
  let pending = ZERO;
  let cumulativeReserves = ZERO;
  return months.map((month) => {
    const inMonth = entries.filter((entry) => entry.month === month);
    const reserve = totalOf(inMonth, LedgerEntryType.RESERVE).negated();
    const change = inMonth
      .filter((entry) => PENDING_TYPES.has(entry.type))
      .reduce((total, entry) => total.plus(entry.amount), ZERO);
    const previousPending = pending;
    pending = pending.plus(change);
    cumulativeReserves = cumulativeReserves.plus(reserve);
    return {
      month,
      previousPending,
      takeHome: totalOf(inMonth, LedgerEntryType.PROFIT_SHARE).minus(reserve),
      reserve,
      withdrawn: totalOf(inMonth, LedgerEntryType.WITHDRAWAL).negated(),
      adjustments: totalOf(inMonth, LedgerEntryType.ADJUSTMENT),
      fundedIn: totalOf(inMonth, LedgerEntryType.FUNDING_IN),
      pending,
      cumulativeReserves,
    };
  });
}

export type ClosePosting = { partnerId: string; type: LedgerEntryType; amount: DecimalString };

/**
 * What closing a month writes to each partner's ledger: the baseline share, the reserve held
 * back (negative), and any external funding the partner put in that month. Amounts stay
 * exact, like the P&L they come from, so ledger take-home matches the P&L to the cent.
 */
export function closePostings(
  distribution: Distribution,
  fundedByPartnerId: Readonly<Record<string, Decimal>>,
): ClosePosting[] {
  return distribution.partners.flatMap((partner) => {
    const postings: ClosePosting[] = [
      {
        partnerId: partner.partnerId,
        type: LedgerEntryType.PROFIT_SHARE,
        amount: partner.baselineShare.toString(),
      },
    ];
    if (!partner.reserve.isZero()) {
      postings.push({
        partnerId: partner.partnerId,
        type: LedgerEntryType.RESERVE,
        amount: partner.reserve.negated().toString(),
      });
    }
    const funded = fundedByPartnerId[partner.partnerId];
    if (funded && !funded.isZero()) {
      postings.push({
        partnerId: partner.partnerId,
        type: LedgerEntryType.FUNDING_IN,
        amount: funded.toString(),
      });
    }
    return postings;
  });
}
