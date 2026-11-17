import { PnlLine, SalesChannel } from '@/generated/prisma/enums';
import { type Decimal, sumDecimals } from '@/lib/decimal';

export const SALES_CHANNEL_ORDER: readonly SalesChannel[] = [
  SalesChannel.UPWORK,
  SalesChannel.COLD_EMAIL,
  SalesChannel.COLD_CALL,
  SalesChannel.LINKEDIN,
  SalesChannel.OTHER,
];

const SALES_LINES: ReadonlySet<PnlLine> = new Set([PnlLine.SALES_SALARIES, PnlLine.SALES_OVERHEAD]);

export function isSalesLine(pnlLine: PnlLine): boolean {
  return SALES_LINES.has(pnlLine);
}

/** A channel tag belongs on sales expenses only (PRD §5.8); anything else drops it. */
export function channelForExpense(
  pnlLine: PnlLine,
  channel: SalesChannel | null,
): SalesChannel | null {
  return isSalesLine(pnlLine) ? channel : null;
}

/** Sales spend in the reporting currency; channel null = a sales expense nobody tagged. */
export type ChannelSpend = { channel: SalesChannel | null; amount: Decimal };

export type ChannelActivity = {
  channel: SalesChannel;
  interestedResponses: number;
  leadsClosed: number;
  callsMade: number;
};

export type ChannelCac = {
  spend: Decimal;
  interestedResponses: number;
  leadsClosed: number;
  callsMade: number;
  costPerInterested: Decimal | null;
  costPerLead: Decimal | null;
};

export type SalesCac = {
  channels: (ChannelCac & { channel: SalesChannel })[];
  untaggedSpend: Decimal;
  total: ChannelCac;
};

function costPer(spend: Decimal, count: number): Decimal | null {
  return count === 0 ? null : spend.dividedBy(count);
}

function cacOf(spend: Decimal, activity: readonly ChannelActivity[]): ChannelCac {
  const count = (pick: (entry: ChannelActivity) => number) =>
    activity.reduce((total, entry) => total + pick(entry), 0);
  const interestedResponses = count((entry) => entry.interestedResponses);
  const leadsClosed = count((entry) => entry.leadsClosed);
  return {
    spend,
    interestedResponses,
    leadsClosed,
    callsMade: count((entry) => entry.callsMade),
    costPerInterested: costPer(spend, interestedResponses),
    costPerLead: costPer(spend, leadsClosed),
  };
}

/**
 * PRD §5.8: spend per channel, cost per interested response and cost per closed lead.
 * The total includes untagged sales spend, so it ties to the sales lines of the P&L.
 */
export function computeSalesCac(
  spend: readonly ChannelSpend[],
  activity: readonly ChannelActivity[],
): SalesCac {
  const spendFor = (channel: SalesChannel | null) =>
    sumDecimals(spend.filter((entry) => entry.channel === channel).map((entry) => entry.amount));
  return {
    channels: SALES_CHANNEL_ORDER.map((channel) => ({
      channel,
      ...cacOf(
        spendFor(channel),
        activity.filter((entry) => entry.channel === channel),
      ),
    })),
    untaggedSpend: spendFor(null),
    total: cacOf(sumDecimals(spend.map((entry) => entry.amount)), activity),
  };
}
