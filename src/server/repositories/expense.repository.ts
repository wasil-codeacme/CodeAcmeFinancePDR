import { EntryStatus, type FundingSource } from '@/generated/prisma/enums';
import type { Prisma } from '@/generated/prisma/client';
import type { DecimalString } from '@/lib/decimal';
import { type MonthKey, isoDateToDate, monthOfIsoDate } from '@/lib/month';
import { db } from '@/server/repositories/db';
import { dateToIsoDate, dateToMonthKey, monthKeyToDbDate } from '@/server/repositories/mappers';
import type { ExpenseRecord } from '@/types/expense';

export type ExpenseData = {
  status: EntryStatus;
  expenseDate: string;
  paidOn: string | null;
  categoryId: string;
  item: string;
  payeeTeamMemberId: string | null;
  amount: DecimalString;
  currency: string;
  fundingSource: FundingSource;
  fundingPartnerId: string | null;
  paidFromAccountId: string | null;
  recurringTemplateId: string | null;
  notes: string | null;
};

const EXPENSE_INCLUDE = {
  category: { select: { name: true } },
  payee: { select: { name: true } },
  fundingPartner: { select: { name: true } },
  paidFromAccount: { select: { name: true } },
} as const satisfies Prisma.ExpenseInclude;

type ExpenseRow = Prisma.ExpenseGetPayload<{ include: typeof EXPENSE_INCLUDE }>;

function toRecord(row: ExpenseRow): ExpenseRecord {
  return {
    id: row.id,
    status: row.status,
    expenseDate: dateToIsoDate(row.expenseDate),
    paidOn: row.paidOn ? dateToIsoDate(row.paidOn) : null,
    month: dateToMonthKey(row.month),
    categoryId: row.categoryId,
    categoryName: row.category.name,
    item: row.item,
    payeeTeamMemberId: row.payeeTeamMemberId,
    payeeName: row.payee?.name ?? null,
    amount: row.amount.toString(),
    currency: row.currency,
    fundingSource: row.fundingSource,
    fundingPartnerId: row.fundingPartnerId,
    fundingPartnerName: row.fundingPartner?.name ?? null,
    paidFromAccountId: row.paidFromAccountId,
    paidFromAccountName: row.paidFromAccount?.name ?? null,
    recurringTemplateId: row.recurringTemplateId,
    notes: row.notes,
  };
}

/** An expense's P&L month is always the month of its date (PRD §4: months are filters). */
function toRow(data: ExpenseData) {
  return {
    ...data,
    expenseDate: isoDateToDate(data.expenseDate),
    paidOn: data.paidOn ? isoDateToDate(data.paidOn) : null,
    month: monthKeyToDbDate(monthOfIsoDate(data.expenseDate)),
  };
}

const LIVE = { deletedAt: null } as const;

export const expenseRepository = {
  async listForMonth(month: MonthKey): Promise<ExpenseRecord[]> {
    const rows = await db().expense.findMany({
      where: { ...LIVE, month: monthKeyToDbDate(month) },
      include: EXPENSE_INCLUDE,
      orderBy: [{ expenseDate: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(toRecord);
  },

  countDraftsForMonth(month: MonthKey): Promise<number> {
    return db().expense.count({
      where: { ...LIVE, status: EntryStatus.DRAFT, month: monthKeyToDbDate(month) },
    });
  },

  countForMonth(month: MonthKey): Promise<number> {
    return db().expense.count({ where: { ...LIVE, month: monthKeyToDbDate(month) } });
  },

  async findById(id: string): Promise<ExpenseRecord | null> {
    const row = await db().expense.findFirst({ where: { ...LIVE, id }, include: EXPENSE_INCLUDE });
    return row ? toRecord(row) : null;
  },

  async create(data: ExpenseData, actorId: string): Promise<ExpenseRecord> {
    const row = await db().expense.create({
      data: { ...toRow(data), createdById: actorId },
      include: EXPENSE_INCLUDE,
    });
    return toRecord(row);
  },

  async update(id: string, data: ExpenseData, actorId: string): Promise<ExpenseRecord> {
    const row = await db().expense.update({
      where: { id },
      data: { ...toRow(data), updatedById: actorId },
      include: EXPENSE_INCLUDE,
    });
    return toRecord(row);
  },

  async setStatus(id: string, status: EntryStatus, actorId: string): Promise<ExpenseRecord> {
    const row = await db().expense.update({
      where: { id },
      data: { status, updatedById: actorId },
      include: EXPENSE_INCLUDE,
    });
    return toRecord(row);
  },

  async softDelete(id: string, actorId: string): Promise<ExpenseRecord> {
    const row = await db().expense.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: actorId },
      include: EXPENSE_INCLUDE,
    });
    return toRecord(row);
  },

  /** Includes deleted drafts: deleting a generated draft means "skip it this month". */
  async templateIdsGeneratedFor(month: MonthKey): Promise<Set<string>> {
    const rows = await db().expense.findMany({
      where: { month: monthKeyToDbDate(month), recurringTemplateId: { not: null } },
      select: { recurringTemplateId: true },
    });
    return new Set(
      rows.flatMap((row) => (row.recurringTemplateId ? [row.recurringTemplateId] : [])),
    );
  },

  async pnlExpensesForMonth(month: MonthKey) {
    const rows = await db().expense.findMany({
      where: { ...LIVE, status: EntryStatus.CONFIRMED, month: monthKeyToDbDate(month) },
      select: {
        amount: true,
        currency: true,
        fundingSource: true,
        categoryId: true,
        fundingPartnerId: true,
      },
    });
    return rows.map((row) => ({ ...row, amount: row.amount.toString() }));
  },
};
