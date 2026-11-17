import { Prisma } from '@/generated/prisma/client';
import { PeriodStatus } from '@/generated/prisma/enums';
import type { DecimalString } from '@/lib/decimal';
import type { MonthKey } from '@/lib/month';
import { db } from '@/server/repositories/db';
import { dateToMonthKey, monthKeyToDbDate } from '@/server/repositories/mappers';

export type PeriodRecord = {
  id: string;
  month: MonthKey;
  status: PeriodStatus;
  snapshot: unknown;
  closedById: string | null;
  closedAt: Date | null;
  reopenedAt: Date | null;
  reopenReason: string | null;
};

export type NextMonthReserveRecord = {
  id: string;
  month: MonthKey;
  targetMonth: MonthKey;
  amount: DecimalString;
  note: string | null;
};

function toPeriod(row: {
  id: string;
  month: Date;
  status: PeriodStatus;
  snapshot: Prisma.JsonValue;
  closedById: string | null;
  closedAt: Date | null;
  reopenedAt: Date | null;
  reopenReason: string | null;
}): PeriodRecord {
  return { ...row, month: dateToMonthKey(row.month) };
}

export const periodRepository = {
  async findByMonth(month: MonthKey): Promise<PeriodRecord | null> {
    const row = await db().period.findUnique({ where: { month: monthKeyToDbDate(month) } });
    return row ? toPeriod(row) : null;
  },

  async listByMonths(months: readonly MonthKey[]): Promise<PeriodRecord[]> {
    if (months.length === 0) return [];
    const rows = await db().period.findMany({
      where: { month: { in: months.map(monthKeyToDbDate) } },
    });
    return rows.map(toPeriod);
  },

  async closedAmong(months: readonly MonthKey[]): Promise<MonthKey[]> {
    if (months.length === 0) return [];
    const rows = await db().period.findMany({
      where: { status: PeriodStatus.CLOSED, month: { in: months.map(monthKeyToDbDate) } },
      select: { month: true },
    });
    return rows.map((row) => dateToMonthKey(row.month));
  },

  async listClosedMonths(): Promise<MonthKey[]> {
    const rows = await db().period.findMany({
      where: { status: PeriodStatus.CLOSED },
      select: { month: true },
      orderBy: { month: 'asc' },
    });
    return rows.map((row) => dateToMonthKey(row.month));
  },

  async markClosed(
    month: MonthKey,
    data: { snapshot: Prisma.InputJsonValue; closedById: string; closedAt: Date },
  ): Promise<PeriodRecord> {
    const monthDate = monthKeyToDbDate(month);
    const values = { status: PeriodStatus.CLOSED, ...data, reopenedAt: null, reopenReason: null };
    const row = await db().period.upsert({
      where: { month: monthDate },
      create: { month: monthDate, ...values },
      update: values,
    });
    return toPeriod(row);
  },

  async markReopened(
    id: string,
    data: { reopenedById: string; reopenedAt: Date; reopenReason: string },
  ): Promise<PeriodRecord> {
    const row = await db().period.update({
      where: { id },
      data: { status: PeriodStatus.OPEN, snapshot: Prisma.DbNull, ...data },
    });
    return toPeriod(row);
  },
};

const LIVE = { deletedAt: null } as const;

function toReserve(row: {
  id: string;
  month: Date;
  targetMonth: Date;
  amount: { toString(): string };
  note: string | null;
}): NextMonthReserveRecord {
  return {
    id: row.id,
    month: dateToMonthKey(row.month),
    targetMonth: dateToMonthKey(row.targetMonth),
    amount: row.amount.toString(),
    note: row.note,
  };
}

export const nextMonthReserveRepository = {
  async listForMonth(month: MonthKey): Promise<NextMonthReserveRecord[]> {
    const rows = await db().nextMonthReserve.findMany({
      where: { ...LIVE, month: monthKeyToDbDate(month) },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toReserve);
  },

  async findById(id: string): Promise<NextMonthReserveRecord | null> {
    const row = await db().nextMonthReserve.findFirst({ where: { ...LIVE, id } });
    return row ? toReserve(row) : null;
  },

  async create(data: {
    month: MonthKey;
    targetMonth: MonthKey;
    amount: DecimalString;
    note: string | null;
    createdById: string;
  }): Promise<NextMonthReserveRecord> {
    const row = await db().nextMonthReserve.create({
      data: {
        ...data,
        month: monthKeyToDbDate(data.month),
        targetMonth: monthKeyToDbDate(data.targetMonth),
      },
    });
    return toReserve(row);
  },

  async softDelete(id: string): Promise<NextMonthReserveRecord> {
    return toReserve(
      await db().nextMonthReserve.update({ where: { id }, data: { deletedAt: new Date() } }),
    );
  },
};
