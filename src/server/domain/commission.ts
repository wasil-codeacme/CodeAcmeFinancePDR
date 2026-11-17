import { CommissionBase } from '@/generated/prisma/enums';
import { Decimal, type DecimalString, ZERO, percentOf } from '@/lib/decimal';

type CommissionEntry = {
  closedByTeamMemberId: string | null;
  gross: DecimalString;
  feePercent: DecimalString;
};

export type CommissionRule = { ratePercent: DecimalString; base: CommissionBase };

export type BdCommission = { teamMemberId: string; base: Decimal; commission: Decimal };

/**
 * PRD §6: commission = rate × the revenue of the projects that BD person closed — by default
 * net revenue, i.e. what is left after the platform fee (today 6% of the amount after
 * Upwork's 10%). Only team members marked as earning commission are paid.
 */
export function computeBdCommission(input: {
  entries: readonly CommissionEntry[];
  earnerIds: ReadonlySet<string>;
  rule: CommissionRule | null;
}): BdCommission[] {
  const { rule } = input;
  if (!rule) return [];
  const baseByMember = new Map<string, Decimal>();
  for (const entry of input.entries) {
    const memberId = entry.closedByTeamMemberId;
    if (!memberId || !input.earnerIds.has(memberId)) continue;
    const gross = new Decimal(entry.gross);
    const base =
      rule.base === CommissionBase.GROSS_REVENUE
        ? gross
        : gross.minus(percentOf(gross, entry.feePercent));
    baseByMember.set(memberId, (baseByMember.get(memberId) ?? ZERO).plus(base));
  }
  return [...baseByMember].map(([teamMemberId, base]) => ({
    teamMemberId,
    base,
    commission: percentOf(base, rule.ratePercent),
  }));
}
