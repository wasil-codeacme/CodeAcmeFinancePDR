import type { DecimalString } from '@/lib/decimal';
import type { MonthKey } from '@/lib/month';
import { db } from '@/server/repositories/db';
import { dateToMonthKey, monthKeyToDbDate } from '@/server/repositories/mappers';

export type PlatformFeeVersionRecord = { effectiveFrom: MonthKey; feePercent: DecimalString };

export type PlatformRecord = {
  id: string;
  name: string;
  active: boolean;
  feeVersions: PlatformFeeVersionRecord[];
};

const PLATFORM_SELECT = {
  id: true,
  name: true,
  active: true,
  feeVersions: {
    select: { effectiveFrom: true, feePercent: true },
    orderBy: { effectiveFrom: 'desc' },
  },
} as const;

function toPlatform(row: {
  id: string;
  name: string;
  active: boolean;
  feeVersions: { effectiveFrom: Date; feePercent: { toString(): string } }[];
}): PlatformRecord {
  return {
    id: row.id,
    name: row.name,
    active: row.active,
    feeVersions: row.feeVersions.map((version) => ({
      effectiveFrom: dateToMonthKey(version.effectiveFrom),
      feePercent: version.feePercent.toString(),
    })),
  };
}

export const platformRepository = {
  async list(): Promise<PlatformRecord[]> {
    const rows = await db().platform.findMany({
      select: PLATFORM_SELECT,
      orderBy: { name: 'asc' },
    });
    return rows.map(toPlatform);
  },

  async findById(id: string): Promise<PlatformRecord | null> {
    const row = await db().platform.findUnique({ where: { id }, select: PLATFORM_SELECT });
    return row ? toPlatform(row) : null;
  },

  async create(data: {
    name: string;
    feePercent: DecimalString;
    effectiveFrom: MonthKey;
  }): Promise<PlatformRecord> {
    const row = await db().platform.create({
      data: {
        name: data.name,
        feeVersions: {
          create: {
            effectiveFrom: monthKeyToDbDate(data.effectiveFrom),
            feePercent: data.feePercent,
          },
        },
      },
      select: PLATFORM_SELECT,
    });
    return toPlatform(row);
  },

  async update(id: string, data: { name: string; active: boolean }): Promise<PlatformRecord> {
    return toPlatform(await db().platform.update({ where: { id }, data, select: PLATFORM_SELECT }));
  },

  async setFee(
    platformId: string,
    effectiveFrom: MonthKey,
    feePercent: DecimalString,
  ): Promise<void> {
    const effectiveDate = monthKeyToDbDate(effectiveFrom);
    await db().platformFeeVersion.upsert({
      where: { platformId_effectiveFrom: { platformId, effectiveFrom: effectiveDate } },
      create: { platformId, effectiveFrom: effectiveDate, feePercent },
      update: { feePercent },
    });
  },
};
