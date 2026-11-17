import type { SalesChannel } from '@/generated/prisma/enums';
import type { MonthKey } from '@/lib/month';
import { db } from '@/server/repositories/db';
import { dateToMonthKey, monthKeyToDbDate } from '@/server/repositories/mappers';

export type SalesActivityRecord = {
  month: MonthKey;
  channel: SalesChannel;
  interestedResponses: number;
  leadsClosed: number;
  callsMade: number;
};

function toRecord(row: {
  month: Date;
  channel: SalesChannel;
  interestedResponses: number;
  leadsClosed: number;
  callsMade: number;
}): SalesActivityRecord {
  return {
    month: dateToMonthKey(row.month),
    channel: row.channel,
    interestedResponses: row.interestedResponses,
    leadsClosed: row.leadsClosed,
    callsMade: row.callsMade,
  };
}

export const salesActivityRepository = {
  async listForMonths(months: readonly MonthKey[]): Promise<SalesActivityRecord[]> {
    if (months.length === 0) return [];
    const rows = await db().salesActivity.findMany({
      where: { month: { in: months.map(monthKeyToDbDate) } },
    });
    return rows.map(toRecord);
  },

  async find(month: MonthKey, channel: SalesChannel): Promise<SalesActivityRecord | null> {
    const row = await db().salesActivity.findUnique({
      where: { month_channel: { month: monthKeyToDbDate(month), channel } },
    });
    return row ? toRecord(row) : null;
  },

  async upsert(data: SalesActivityRecord, actorId: string): Promise<SalesActivityRecord> {
    const counts = {
      interestedResponses: data.interestedResponses,
      leadsClosed: data.leadsClosed,
      callsMade: data.callsMade,
      updatedById: actorId,
    };
    const row = await db().salesActivity.upsert({
      where: { month_channel: { month: monthKeyToDbDate(data.month), channel: data.channel } },
      create: { month: monthKeyToDbDate(data.month), channel: data.channel, ...counts },
      update: counts,
    });
    return toRecord(row);
  },
};
