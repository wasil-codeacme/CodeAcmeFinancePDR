import type { DecimalString } from '@/lib/decimal';
import type { MonthKey } from '@/lib/month';
import { db } from '@/server/repositories/db';
import { dateToMonthKey, decimalToString, monthKeyToDbDate } from '@/server/repositories/mappers';

export type PartnerRecord = { id: string; name: string; active: boolean };

export type SplitVersionRecord = {
  id: string;
  effectiveFrom: MonthKey;
  shares: { partnerId: string; partnerName: string; splitPercent: DecimalString }[];
};

export type ReserveRuleRecord = {
  id: string;
  effectiveFrom: MonthKey;
  enabled: boolean;
  reservePercent: DecimalString;
  appliesInLossMonth: boolean;
};

const PARTNER_SELECT = { id: true, name: true, active: true } as const;

export const partnerRepository = {
  list(): Promise<PartnerRecord[]> {
    return db().partner.findMany({ select: PARTNER_SELECT, orderBy: { createdAt: 'asc' } });
  },

  findById(id: string): Promise<PartnerRecord | null> {
    return db().partner.findUnique({ where: { id }, select: PARTNER_SELECT });
  },

  create(name: string): Promise<PartnerRecord> {
    return db().partner.create({ data: { name }, select: PARTNER_SELECT });
  },

  update(id: string, data: { name: string; active: boolean }): Promise<PartnerRecord> {
    return db().partner.update({ where: { id }, data, select: PARTNER_SELECT });
  },
};

export const splitVersionRepository = {
  async list(): Promise<SplitVersionRecord[]> {
    const versions = await db().profitSplitVersion.findMany({
      orderBy: { effectiveFrom: 'desc' },
      select: {
        id: true,
        effectiveFrom: true,
        shares: {
          select: { partnerId: true, splitPercent: true, partner: { select: { name: true } } },
        },
      },
    });
    return versions.map((version) => ({
      id: version.id,
      effectiveFrom: dateToMonthKey(version.effectiveFrom),
      shares: version.shares.map((share) => ({
        partnerId: share.partnerId,
        partnerName: share.partner.name,
        splitPercent: decimalToString(share.splitPercent),
      })),
    }));
  },

  /** One version per start month; saving the same month again replaces its shares. */
  async replace(
    effectiveFrom: MonthKey,
    shares: readonly { partnerId: string; splitPercent: DecimalString }[],
  ): Promise<{ id: string }> {
    const effectiveDate = monthKeyToDbDate(effectiveFrom);
    await db().profitSplitVersion.deleteMany({ where: { effectiveFrom: effectiveDate } });
    return db().profitSplitVersion.create({
      data: {
        effectiveFrom: effectiveDate,
        shares: {
          create: shares.map((share) => ({
            partnerId: share.partnerId,
            splitPercent: share.splitPercent,
          })),
        },
      },
      select: { id: true },
    });
  },
};

function toReserveRule(row: {
  id: string;
  effectiveFrom: Date;
  enabled: boolean;
  reservePercent: { toString(): string };
  appliesInLossMonth: boolean;
}): ReserveRuleRecord {
  return {
    id: row.id,
    effectiveFrom: dateToMonthKey(row.effectiveFrom),
    enabled: row.enabled,
    reservePercent: row.reservePercent.toString(),
    appliesInLossMonth: row.appliesInLossMonth,
  };
}

export const reserveRuleRepository = {
  async list(): Promise<ReserveRuleRecord[]> {
    const rows = await db().reserveRuleVersion.findMany({ orderBy: { effectiveFrom: 'desc' } });
    return rows.map(toReserveRule);
  },

  async upsert(
    effectiveFrom: MonthKey,
    data: { enabled: boolean; reservePercent: DecimalString; appliesInLossMonth: boolean },
  ): Promise<ReserveRuleRecord> {
    const effectiveDate = monthKeyToDbDate(effectiveFrom);
    const row = await db().reserveRuleVersion.upsert({
      where: { effectiveFrom: effectiveDate },
      create: { effectiveFrom: effectiveDate, ...data },
      update: data,
    });
    return toReserveRule(row);
  },
};
