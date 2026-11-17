import type { Decimal } from '@/lib/decimal';
import type { MonthKey } from '@/lib/month';
import { computeBdCommission } from '@/server/domain/commission';
import { pickEffectiveVersion } from '@/server/domain/effective-version';
import { revenueRepository } from '@/server/repositories/revenue.repository';
import {
  type CommissionRuleRecord,
  commissionRuleRepository,
  teamMemberRepository,
} from '@/server/repositories/settings.repository';

export type BdCommissionDue = {
  rule: CommissionRuleRecord | null;
  rows: { teamMemberId: string; name: string; base: Decimal; commission: Decimal }[];
};

/** What BD commission the month's closed deals earn under the rule in force that month. */
export async function loadBdCommission(month: MonthKey): Promise<BdCommissionDue> {
  const [rules, members, entries] = await Promise.all([
    commissionRuleRepository.list(),
    teamMemberRepository.list(),
    revenueRepository.commissionEntriesForMonth(month),
  ]);
  const rule = pickEffectiveVersion(rules, month);
  const earners = members.filter((member) => member.earnsCommission);
  const rows = computeBdCommission({
    entries,
    earnerIds: new Set(earners.map((member) => member.id)),
    rule,
  }).filter((row) => !row.commission.isZero());
  return {
    rule,
    rows: rows.map((row) => ({
      ...row,
      name: earners.find((member) => member.id === row.teamMemberId)?.name ?? row.teamMemberId,
    })),
  };
}
