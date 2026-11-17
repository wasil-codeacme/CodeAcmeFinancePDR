import { describe, expect, it } from 'vitest';

import { PnlLine, SalesChannel } from '@/generated/prisma/enums';
import { Decimal } from '@/lib/decimal';
import { channelForExpense, computeSalesCac } from '@/server/domain/sales-cac';

describe('computeSalesCac (PRD §5.8)', () => {
  const result = computeSalesCac(
    [
      { channel: SalesChannel.UPWORK, amount: new Decimal('400') },
      { channel: SalesChannel.UPWORK, amount: new Decimal('100') },
      { channel: SalesChannel.COLD_CALL, amount: new Decimal('134') },
      { channel: null, amount: new Decimal('50') },
    ],
    [
      { channel: SalesChannel.UPWORK, interestedResponses: 10, leadsClosed: 2, callsMade: 0 },
      { channel: SalesChannel.COLD_CALL, interestedResponses: 0, leadsClosed: 0, callsMade: 36 },
    ],
  );

  it('works out spend, cost per interested response and cost per closed lead per channel', () => {
    const upwork = result.channels.find((channel) => channel.channel === SalesChannel.UPWORK);
    expect(upwork?.spend.toNumber()).toBe(500);
    expect(upwork?.costPerInterested?.toNumber()).toBe(50);
    expect(upwork?.costPerLead?.toNumber()).toBe(250);
  });

  it('leaves a cost blank when there were no responses or leads to divide by', () => {
    const coldCall = result.channels.find((channel) => channel.channel === SalesChannel.COLD_CALL);
    expect(coldCall?.costPerInterested).toBeNull();
    expect(coldCall?.costPerLead).toBeNull();
    expect(coldCall?.callsMade).toBe(36);
  });

  it('lists every channel in a fixed order, even with nothing in it', () => {
    expect(result.channels.map((channel) => channel.channel)).toEqual([
      SalesChannel.UPWORK,
      SalesChannel.COLD_EMAIL,
      SalesChannel.COLD_CALL,
      SalesChannel.LINKEDIN,
      SalesChannel.OTHER,
    ]);
  });

  it('keeps untagged sales spend visible so the total ties to the sales P&L lines', () => {
    expect(result.untaggedSpend.toNumber()).toBe(50);
    expect(result.total.spend.toNumber()).toBe(684);
    expect(result.total.costPerLead?.toNumber()).toBe(342);
  });
});

describe('channelForExpense', () => {
  it('keeps a channel only on sales expenses', () => {
    expect(channelForExpense(PnlLine.SALES_OVERHEAD, SalesChannel.COLD_EMAIL)).toBe(
      SalesChannel.COLD_EMAIL,
    );
    expect(channelForExpense(PnlLine.SALES_SALARIES, null)).toBeNull();
    expect(channelForExpense(PnlLine.OPERATIONS_OVERHEAD, SalesChannel.UPWORK)).toBeNull();
  });
});
