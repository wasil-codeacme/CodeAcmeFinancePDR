import type { LedgerEntryType } from '@/generated/prisma/enums';
import type { DecimalString } from '@/lib/decimal';
import { type MonthKey, isoDateToDate } from '@/lib/month';
import { db } from '@/server/repositories/db';
import { dateToIsoDate, dateToMonthKey, monthKeyToDbDate } from '@/server/repositories/mappers';

export type LedgerEntryRecord = {
  id: string;
  partnerId: string;
  partnerName: string;
  month: MonthKey;
  occurredOn: string;
  type: LedgerEntryType;
  amount: DecimalString;
  accountId: string | null;
  accountName: string | null;
  note: string | null;
  periodId: string | null;
};

export type LedgerEntryData = {
  partnerId: string;
  occurredOn: string;
  month: MonthKey;
  type: LedgerEntryType;
  amount: DecimalString;
  accountId: string | null;
  note: string | null;
  periodId: string | null;
  createdById: string;
};

const LIVE = { deletedAt: null } as const;
const ENTRY_INCLUDE = {
  partner: { select: { name: true } },
  account: { select: { name: true } },
} as const;

function toRecord(row: {
  id: string;
  partnerId: string;
  partner: { name: string };
  month: Date;
  occurredOn: Date;
  type: LedgerEntryType;
  amount: { toString(): string };
  accountId: string | null;
  account: { name: string } | null;
  note: string | null;
  periodId: string | null;
}): LedgerEntryRecord {
  return {
    id: row.id,
    partnerId: row.partnerId,
    partnerName: row.partner.name,
    month: dateToMonthKey(row.month),
    occurredOn: dateToIsoDate(row.occurredOn),
    type: row.type,
    amount: row.amount.toString(),
    accountId: row.accountId,
    accountName: row.account?.name ?? null,
    note: row.note,
    periodId: row.periodId,
  };
}

export const ledgerRepository = {
  /** Every entry, or only those paid into or out of the given accounts. */
  async list(accountIds?: readonly string[]): Promise<LedgerEntryRecord[]> {
    const rows = await db().partnerLedgerEntry.findMany({
      where: accountIds ? { ...LIVE, accountId: { in: [...accountIds] } } : LIVE,
      include: ENTRY_INCLUDE,
      orderBy: [{ month: 'asc' }, { occurredOn: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(toRecord);
  },

  async findById(id: string): Promise<LedgerEntryRecord | null> {
    const row = await db().partnerLedgerEntry.findFirst({
      where: { ...LIVE, id },
      include: ENTRY_INCLUDE,
    });
    return row ? toRecord(row) : null;
  },

  async create(data: LedgerEntryData): Promise<LedgerEntryRecord> {
    const row = await db().partnerLedgerEntry.create({
      data: {
        ...data,
        occurredOn: isoDateToDate(data.occurredOn),
        month: monthKeyToDbDate(data.month),
      },
      include: ENTRY_INCLUDE,
    });
    return toRecord(row);
  },

  async softDelete(id: string): Promise<LedgerEntryRecord> {
    const row = await db().partnerLedgerEntry.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: ENTRY_INCLUDE,
    });
    return toRecord(row);
  },

  /** Reopening a month removes exactly what its close posted; manual entries stay. */
  async softDeleteForPeriod(periodId: string): Promise<number> {
    const result = await db().partnerLedgerEntry.updateMany({
      where: { ...LIVE, periodId },
      data: { deletedAt: new Date() },
    });
    return result.count;
  },
};
