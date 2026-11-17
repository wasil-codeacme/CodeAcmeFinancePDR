import { describe, expect, it } from 'vitest';

import { computeRevenueLine, summarizeReceivables } from '@/server/domain/revenue-math';

describe('computeRevenueLine (PRD §6)', () => {
  it('derives fee, net and an outstanding receivable from gross and fee %', () => {
    const line = computeRevenueLine({
      gross: '1670',
      feePercent: '10',
      receipts: [],
      adjustments: [],
    });
    expect(line.fee.toNumber()).toBe(167);
    expect(line.net.toNumber()).toBe(1503);
    expect(line.outstanding.toNumber()).toBe(1503);
    expect(line.unfunded.toNumber()).toBe(1503);
  });

  it('keeps escrow funding outstanding but classes it as safe, not at risk', () => {
    const line = computeRevenueLine({
      gross: '1000',
      feePercent: '10',
      receipts: [
        { amount: '400', isEscrow: false },
        { amount: '300', isEscrow: true },
      ],
      adjustments: [],
    });
    expect(line.received.toNumber()).toBe(400);
    expect(line.fundedEscrow.toNumber()).toBe(300);
    expect(line.outstanding.toNumber()).toBe(500);
    expect(line.unfunded.toNumber()).toBe(200);
  });

  it('reduces outstanding by write-offs and treats a blank draft gross as zero', () => {
    const written = computeRevenueLine({
      gross: '100',
      feePercent: '0',
      receipts: [],
      adjustments: [{ amount: '100' }],
    });
    expect(written.outstanding.toNumber()).toBe(0);
    const draft = computeRevenueLine({
      gross: null,
      feePercent: '10',
      receipts: [],
      adjustments: [],
    });
    expect(draft.net.toNumber()).toBe(0);
  });
});

describe('summarizeReceivables', () => {
  it('totals the breakdown and computes collection rate = received ÷ net booked', () => {
    const lines = [
      computeRevenueLine({
        gross: '1000',
        feePercent: '0',
        receipts: [{ amount: '750', isEscrow: false }],
        adjustments: [],
      }),
      computeRevenueLine({ gross: '1000', feePercent: '0', receipts: [], adjustments: [] }),
    ];
    const totals = summarizeReceivables(lines);
    expect(totals.netBooked.toNumber()).toBe(2000);
    expect(totals.outstanding.toNumber()).toBe(1250);
    expect(totals.collectionRate?.toNumber()).toBe(0.375);
  });

  it('leaves the collection rate blank with nothing booked', () => {
    expect(summarizeReceivables([]).collectionRate).toBeNull();
  });
});
