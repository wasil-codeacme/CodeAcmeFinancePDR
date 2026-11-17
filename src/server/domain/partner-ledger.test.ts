import { describe, expect, it } from 'vitest';

import { LedgerEntryType } from '@/generated/prisma/enums';
import { closePostings, summarizeLedger } from '@/server/domain/partner-ledger';
import { computeDistribution } from '@/server/domain/distribution';
import { Decimal } from '@/lib/decimal';

describe('summarizeLedger (PRD §6: pending = previous + take-home − withdrawn)', () => {
  const entries = [
    { month: '2026-01' as const, type: LedgerEntryType.PROFIT_SHARE, amount: '338' },
    { month: '2026-01' as const, type: LedgerEntryType.RESERVE, amount: '-48' },
    { month: '2026-01' as const, type: LedgerEntryType.WITHDRAWAL, amount: '-200' },
    { month: '2026-01' as const, type: LedgerEntryType.FUNDING_IN, amount: '150' },
    { month: '2026-02' as const, type: LedgerEntryType.PROFIT_SHARE, amount: '340' },
    { month: '2026-02' as const, type: LedgerEntryType.RESERVE, amount: '-49' },
  ];

  it('carries pending to withdraw forward month by month with no typing', () => {
    const [january, february] = summarizeLedger(entries);
    expect(january?.takeHome.toNumber()).toBe(290);
    expect(january?.withdrawn.toNumber()).toBe(200);
    expect(january?.pending.toNumber()).toBe(90);
    expect(february?.previousPending.toNumber()).toBe(90);
    expect(february?.pending.toNumber()).toBe(381);
  });

  it('keeps partner funding out of the withdrawable balance but totals it', () => {
    const [january] = summarizeLedger(entries);
    expect(january?.fundedIn.toNumber()).toBe(150);
    expect(january?.pending.toNumber()).toBe(90);
  });

  it('runs cumulative reserves', () => {
    const [january, february] = summarizeLedger(entries);
    expect(january?.cumulativeReserves.toNumber()).toBe(48);
    expect(february?.cumulativeReserves.toNumber()).toBe(97);
  });

  it('counts adjustments toward pending', () => {
    const [only] = summarizeLedger([
      { month: '2026-03', type: LedgerEntryType.ADJUSTMENT, amount: '-10' },
    ]);
    expect(only?.pending.toNumber()).toBe(-10);
  });
});

describe('closePostings', () => {
  it('posts each partner baseline share, reserve and funding for the closed month', () => {
    const distribution = computeDistribution({
      distributableProfit: new Decimal('1000'),
      shares: [
        { partnerId: 'a', partnerName: 'A', splitPercent: '60' },
        { partnerId: 'b', partnerName: 'B', splitPercent: '40' },
      ],
      reserveRule: { enabled: true, reservePercent: '5', appliesInLossMonth: false },
      rate: null,
    });
    const postings = closePostings(distribution, { b: new Decimal('75') });
    expect(postings).toEqual(
      expect.arrayContaining([
        { partnerId: 'a', type: LedgerEntryType.PROFIT_SHARE, amount: '600' },
        { partnerId: 'a', type: LedgerEntryType.RESERVE, amount: '-50' },
        { partnerId: 'b', type: LedgerEntryType.PROFIT_SHARE, amount: '400' },
        { partnerId: 'b', type: LedgerEntryType.RESERVE, amount: '-50' },
        { partnerId: 'b', type: LedgerEntryType.FUNDING_IN, amount: '75' },
      ]),
    );
    expect(postings).toHaveLength(5);
  });

  it('skips zero reserves and zero funding', () => {
    const distribution = computeDistribution({
      distributableProfit: new Decimal('-100'),
      shares: [{ partnerId: 'a', partnerName: 'A', splitPercent: '100' }],
      reserveRule: { enabled: true, reservePercent: '5', appliesInLossMonth: false },
      rate: null,
    });
    expect(closePostings(distribution, {})).toEqual([
      { partnerId: 'a', type: LedgerEntryType.PROFIT_SHARE, amount: '-100' },
    ]);
  });
});

describe('closePostings precision', () => {
  it('posts exact amounts so take-home in the ledger equals the P&L to the cent', () => {
    const distribution = computeDistribution({
      distributableProfit: new Decimal('970.456834532374'),
      shares: [{ partnerId: 'c', partnerName: 'C', splitPercent: '30' }],
      reserveRule: { enabled: true, reservePercent: '5', appliesInLossMonth: true },
      rate: null,
    });
    const [share, reserve] = closePostings(distribution, {});
    const takeHome = new Decimal(share?.amount ?? 0).plus(reserve?.amount ?? 0);
    expect(takeHome.toFixed(2)).toBe(distribution.partners[0]?.takeHome.toFixed(2));
    expect(takeHome.toFixed(2)).toBe('242.61');
  });
});
