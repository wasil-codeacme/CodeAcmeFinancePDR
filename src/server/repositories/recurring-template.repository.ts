import type { Prisma } from '@/generated/prisma/client';
import { db } from '@/server/repositories/db';
import { dateToMonthKey, monthKeyToDbDate } from '@/server/repositories/mappers';
import type { RecurringTemplateRecord } from '@/types/expense';

export type RecurringTemplateData = Omit<RecurringTemplateRecord, 'id' | 'categoryName'>;

const TEMPLATE_INCLUDE = {
  category: { select: { name: true } },
} as const satisfies Prisma.RecurringTemplateInclude;

type TemplateRow = Prisma.RecurringTemplateGetPayload<{ include: typeof TEMPLATE_INCLUDE }>;

function toRecord(row: TemplateRow): RecurringTemplateRecord {
  return {
    id: row.id,
    categoryId: row.categoryId,
    categoryName: row.category.name,
    item: row.item,
    payeeTeamMemberId: row.payeeTeamMemberId,
    amount: row.amount.toString(),
    currency: row.currency,
    fundingSource: row.fundingSource,
    fundingPartnerId: row.fundingPartnerId,
    paidFromAccountId: row.paidFromAccountId,
    salesChannel: row.salesChannel,
    notes: row.notes,
    frequency: row.frequency,
    dayOfMonth: row.dayOfMonth,
    startMonth: dateToMonthKey(row.startMonth),
    endMonth: row.endMonth ? dateToMonthKey(row.endMonth) : null,
    active: row.active,
  };
}

function toRow(data: RecurringTemplateData) {
  return {
    ...data,
    startMonth: monthKeyToDbDate(data.startMonth),
    endMonth: data.endMonth ? monthKeyToDbDate(data.endMonth) : null,
  };
}

export const recurringTemplateRepository = {
  async list(): Promise<RecurringTemplateRecord[]> {
    const rows = await db().recurringTemplate.findMany({
      include: TEMPLATE_INCLUDE,
      orderBy: [{ active: 'desc' }, { item: 'asc' }],
    });
    return rows.map(toRecord);
  },

  async listActive(): Promise<RecurringTemplateRecord[]> {
    const rows = await db().recurringTemplate.findMany({
      where: { active: true },
      include: TEMPLATE_INCLUDE,
    });
    return rows.map(toRecord);
  },

  async findById(id: string): Promise<RecurringTemplateRecord | null> {
    const row = await db().recurringTemplate.findUnique({
      where: { id },
      include: TEMPLATE_INCLUDE,
    });
    return row ? toRecord(row) : null;
  },

  async create(data: RecurringTemplateData): Promise<RecurringTemplateRecord> {
    return toRecord(
      await db().recurringTemplate.create({ data: toRow(data), include: TEMPLATE_INCLUDE }),
    );
  },

  async update(id: string, data: RecurringTemplateData): Promise<RecurringTemplateRecord> {
    return toRecord(
      await db().recurringTemplate.update({
        where: { id },
        data: toRow(data),
        include: TEMPLATE_INCLUDE,
      }),
    );
  },
};
