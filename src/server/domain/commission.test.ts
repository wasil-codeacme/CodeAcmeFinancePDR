import { describe, expect, it } from 'vitest';

import { CommissionBase } from '@/generated/prisma/enums';
import { computeBdCommission } from '@/server/domain/commission';

const EARNERS = new Set(['bd-1', 'bd-2']);

describe('computeBdCommission (PRD §6)', () => {
  it('pays the rate on net revenue after the platform fee (today: 6% of the amount after Upwork 10%)', () => {
    const result = computeBdCommission({
      entries: [{ closedByTeamMemberId: 'bd-1', gross: '1000', feePercent: '10' }],
      earnerIds: EARNERS,
      rule: { ratePercent: '6', base: CommissionBase.NET_REVENUE },
    });
    expect(result).toEqual([
      { teamMemberId: 'bd-1', base: expect.anything(), commission: expect.anything() },
    ]);
    expect(result[0]?.base.toNumber()).toBe(900);
    expect(result[0]?.commission.toNumber()).toBe(54);
  });

  it('can use gross revenue as the base', () => {
    const [only] = computeBdCommission({
      entries: [{ closedByTeamMemberId: 'bd-1', gross: '1000', feePercent: '10' }],
      earnerIds: EARNERS,
      rule: { ratePercent: '6', base: CommissionBase.GROSS_REVENUE },
    });
    expect(only?.commission.toNumber()).toBe(60);
  });

  it('adds up each BD person separately and ignores people who do not earn commission', () => {
    const result = computeBdCommission({
      entries: [
        { closedByTeamMemberId: 'bd-1', gross: '500', feePercent: '0' },
        { closedByTeamMemberId: 'bd-1', gross: '500', feePercent: '0' },
        { closedByTeamMemberId: 'bd-2', gross: '100', feePercent: '0' },
        { closedByTeamMemberId: 'not-bd', gross: '900', feePercent: '0' },
        { closedByTeamMemberId: null, gross: '900', feePercent: '0' },
      ],
      earnerIds: EARNERS,
      rule: { ratePercent: '10', base: CommissionBase.NET_REVENUE },
    });
    const byPerson = Object.fromEntries(
      result.map((row) => [row.teamMemberId, row.commission.toNumber()]),
    );
    expect(byPerson).toEqual({ 'bd-1': 100, 'bd-2': 10 });
  });

  it('pays nothing without a rule', () => {
    expect(
      computeBdCommission({
        entries: [{ closedByTeamMemberId: 'bd-1', gross: '1000', feePercent: '0' }],
        earnerIds: EARNERS,
        rule: null,
      }),
    ).toEqual([]);
  });
});
