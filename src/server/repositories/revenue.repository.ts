import {
  type AdjustmentKind,
  EntryStatus,
  type InvoiceStatus,
  type ProjectStatus,
  RevenueKind,
} from '@/generated/prisma/enums';
import type { Prisma } from '@/generated/prisma/client';
import type { DecimalString } from '@/lib/decimal';
import { type MonthKey, isoDateToDate } from '@/lib/month';
import { db } from '@/server/repositories/db';
import {
  dateToIsoDate,
  dateToMonthKey,
  monthKeyToDbDate,
  nullableDateToIsoDate,
  nullableDecimalToString,
} from '@/server/repositories/mappers';
import type { RevenueEntryRecord } from '@/types/revenue';

export type RevenueEntryData = {
  kind: RevenueKind;
  status: EntryStatus;
  clientId: string;
  projectId: string | null;
  platformId: string | null;
  bookingMonth: MonthKey;
  description: string | null;
  gross: DecimalString | null;
  feePercent: DecimalString;
  projectStatus: ProjectStatus;
  invoiceStatus: InvoiceStatus;
  referredBy: string | null;
  closedByTeamMemberId: string | null;
  expectedDate: string | null;
  notes: string | null;
};

export type RevenueFilters = {
  clientId?: string;
  platformId?: string;
  projectStatus?: ProjectStatus;
  search?: string;
};

const ENTRY_INCLUDE = {
  client: { select: { name: true } },
  project: { select: { name: true } },
  platform: { select: { name: true } },
  closedBy: { select: { name: true } },
  receipts: {
    where: { deletedAt: null },
    orderBy: { receivedOn: 'asc' },
    include: { account: { select: { name: true } } },
  },
  adjustments: { where: { deletedAt: null }, orderBy: { adjustedOn: 'asc' } },
} as const satisfies Prisma.RevenueEntryInclude;

type EntryRow = Prisma.RevenueEntryGetPayload<{ include: typeof ENTRY_INCLUDE }>;

function toRecord(row: EntryRow): RevenueEntryRecord {
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    clientId: row.clientId,
    clientName: row.client.name,
    projectId: row.projectId,
    projectName: row.project?.name ?? null,
    platformId: row.platformId,
    platformName: row.platform?.name ?? null,
    bookingMonth: dateToMonthKey(row.bookingMonth),
    description: row.description,
    gross: nullableDecimalToString(row.gross),
    feePercent: row.feePercent.toString(),
    projectStatus: row.projectStatus,
    invoiceStatus: row.invoiceStatus,
    referredBy: row.referredBy,
    closedByTeamMemberId: row.closedByTeamMemberId,
    closedByName: row.closedBy?.name ?? null,
    expectedDate: nullableDateToIsoDate(row.expectedDate),
    notes: row.notes,
    receipts: row.receipts.map((receipt) => ({
      id: receipt.id,
      receivedOn: dateToIsoDate(receipt.receivedOn),
      amount: receipt.amount.toString(),
      accountId: receipt.accountId,
      accountName: receipt.account?.name ?? null,
      isEscrow: receipt.isEscrow,
    })),
    adjustments: row.adjustments.map((adjustment) => ({
      id: adjustment.id,
      adjustedOn: dateToIsoDate(adjustment.adjustedOn),
      postingMonth: dateToMonthKey(adjustment.postingMonth),
      amount: adjustment.amount.toString(),
      kind: adjustment.kind,
      reason: adjustment.reason,
    })),
  };
}

function toRow(data: Partial<RevenueEntryData>) {
  const { bookingMonth, expectedDate, ...rest } = data;
  return {
    ...rest,
    ...(bookingMonth !== undefined && { bookingMonth: monthKeyToDbDate(bookingMonth) }),
    ...(expectedDate !== undefined && {
      expectedDate: expectedDate ? isoDateToDate(expectedDate) : null,
    }),
  };
}

function searchWhere(search: string | undefined): Prisma.RevenueEntryWhereInput {
  if (!search) return {};
  const contains = { contains: search, mode: 'insensitive' } as const;
  return {
    OR: [
      { client: { name: contains } },
      { project: { name: contains } },
      { description: contains },
    ],
  };
}

const LIVE = { deletedAt: null } as const;

export const revenueRepository = {
  async listForMonth(month: MonthKey, filters: RevenueFilters): Promise<RevenueEntryRecord[]> {
    const rows = await db().revenueEntry.findMany({
      where: {
        ...LIVE,
        kind: RevenueKind.BOOKED,
        bookingMonth: monthKeyToDbDate(month),
        clientId: filters.clientId,
        platformId: filters.platformId,
        projectStatus: filters.projectStatus,
        ...searchWhere(filters.search),
      },
      include: ENTRY_INCLUDE,
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(toRecord);
  },

  async listForClient(clientId: string): Promise<RevenueEntryRecord[]> {
    const rows = await db().revenueEntry.findMany({
      where: { ...LIVE, clientId },
      include: ENTRY_INCLUDE,
      orderBy: [{ bookingMonth: 'desc' }, { createdAt: 'asc' }],
    });
    return rows.map(toRecord);
  },

  async listConfirmed(): Promise<RevenueEntryRecord[]> {
    const rows = await db().revenueEntry.findMany({
      where: { ...LIVE, status: EntryStatus.CONFIRMED },
      include: ENTRY_INCLUDE,
      orderBy: { bookingMonth: 'asc' },
    });
    return rows.map(toRecord);
  },

  async findById(id: string): Promise<RevenueEntryRecord | null> {
    const row = await db().revenueEntry.findFirst({
      where: { ...LIVE, id },
      include: ENTRY_INCLUDE,
    });
    return row ? toRecord(row) : null;
  },

  async create(data: RevenueEntryData, actorId: string): Promise<RevenueEntryRecord> {
    const { bookingMonth, expectedDate, ...rest } = data;
    const row = await db().revenueEntry.create({
      data: {
        ...rest,
        bookingMonth: monthKeyToDbDate(bookingMonth),
        expectedDate: expectedDate ? isoDateToDate(expectedDate) : null,
        createdById: actorId,
      },
      include: ENTRY_INCLUDE,
    });
    return toRecord(row);
  },

  async update(
    id: string,
    data: Partial<RevenueEntryData>,
    actorId: string,
  ): Promise<RevenueEntryRecord> {
    const row = await db().revenueEntry.update({
      where: { id },
      data: { ...toRow(data), updatedById: actorId },
      include: ENTRY_INCLUDE,
    });
    return toRecord(row);
  },

  async softDelete(id: string, actorId: string): Promise<RevenueEntryRecord> {
    const row = await db().revenueEntry.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: actorId },
      include: ENTRY_INCLUDE,
    });
    return toRecord(row);
  },

  /** Confirmed booked entries in the month that name the BD person who closed them. */
  async commissionEntriesForMonth(
    month: MonthKey,
  ): Promise<{ closedByTeamMemberId: string; gross: DecimalString; feePercent: DecimalString }[]> {
    const rows = await db().revenueEntry.findMany({
      where: {
        ...LIVE,
        kind: RevenueKind.BOOKED,
        status: EntryStatus.CONFIRMED,
        bookingMonth: monthKeyToDbDate(month),
        closedByTeamMemberId: { not: null },
        gross: { not: null },
      },
      select: { closedByTeamMemberId: true, gross: true, feePercent: true },
    });
    return rows.flatMap((row) =>
      row.closedByTeamMemberId && row.gross
        ? [
            {
              closedByTeamMemberId: row.closedByTeamMemberId,
              gross: row.gross.toString(),
              feePercent: row.feePercent.toString(),
            },
          ]
        : [],
    );
  },

  countDraftsForMonth(month: MonthKey): Promise<number> {
    return db().revenueEntry.count({
      where: { ...LIVE, status: EntryStatus.DRAFT, bookingMonth: monthKeyToDbDate(month) },
    });
  },

  countForMonth(month: MonthKey): Promise<number> {
    return db().revenueEntry.count({ where: { ...LIVE, bookingMonth: monthKeyToDbDate(month) } });
  },

  async existsForProjectInMonth(
    clientId: string,
    projectId: string | null,
    month: MonthKey,
  ): Promise<boolean> {
    const count = await db().revenueEntry.count({
      where: { ...LIVE, clientId, projectId, bookingMonth: monthKeyToDbDate(month) },
    });
    return count > 0;
  },

  async createReceipt(data: {
    revenueEntryId: string;
    receivedOn: string;
    amount: DecimalString;
    accountId: string | null;
    isEscrow: boolean;
    createdById: string;
  }): Promise<{ id: string }> {
    return db().receipt.create({
      data: { ...data, receivedOn: isoDateToDate(data.receivedOn) },
      select: { id: true },
    });
  },

  async findReceipt(id: string) {
    return db().receipt.findFirst({ where: { ...LIVE, id } });
  },

  async releaseEscrow(
    id: string,
    data: { receivedOn: string; accountId: string },
  ): Promise<{ id: string }> {
    return db().receipt.update({
      where: { id },
      data: {
        isEscrow: false,
        receivedOn: isoDateToDate(data.receivedOn),
        accountId: data.accountId,
      },
      select: { id: true },
    });
  },

  async softDeleteReceipt(id: string): Promise<{ id: string }> {
    return db().receipt.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  },

  async createAdjustment(data: {
    revenueEntryId: string;
    adjustedOn: string;
    postingMonth: MonthKey;
    amount: DecimalString;
    kind: AdjustmentKind;
    reason: string;
    createdById: string;
  }): Promise<{ id: string }> {
    return db().receivableAdjustment.create({
      data: {
        ...data,
        adjustedOn: isoDateToDate(data.adjustedOn),
        postingMonth: monthKeyToDbDate(data.postingMonth),
      },
      select: { id: true },
    });
  },

  /** P&L inputs for a month: confirmed booked lines and adjustments posted to it. */
  async pnlRevenueForMonth(
    month: MonthKey,
  ): Promise<{ gross: DecimalString; feePercent: DecimalString }[]> {
    const rows = await db().revenueEntry.findMany({
      where: {
        ...LIVE,
        kind: RevenueKind.BOOKED,
        status: EntryStatus.CONFIRMED,
        bookingMonth: monthKeyToDbDate(month),
        gross: { not: null },
      },
      select: { gross: true, feePercent: true },
    });
    return rows.map((row) => ({
      gross: row.gross?.toString() ?? '0',
      feePercent: row.feePercent.toString(),
    }));
  },

  async pnlAdjustmentsForMonth(month: MonthKey): Promise<DecimalString[]> {
    const rows = await db().receivableAdjustment.findMany({
      where: {
        ...LIVE,
        postingMonth: monthKeyToDbDate(month),
        revenueEntry: { ...LIVE, kind: RevenueKind.BOOKED, status: EntryStatus.CONFIRMED },
      },
      select: { amount: true },
    });
    return rows.map((row) => row.amount.toString());
  },
};
