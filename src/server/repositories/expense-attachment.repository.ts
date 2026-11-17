import { db } from '@/server/repositories/db';
import type { ExpenseAttachmentRecord } from '@/types/expense';

export type ExpenseAttachmentData = Omit<ExpenseAttachmentRecord, 'id'> & {
  expenseId: string;
  storageKey: string;
  createdById: string;
};

export type StoredAttachment = ExpenseAttachmentRecord & { expenseId: string; storageKey: string };

const LIVE = { deletedAt: null } as const;
const SELECT = {
  id: true,
  expenseId: true,
  storageKey: true,
  fileName: true,
  contentType: true,
  size: true,
} as const;

export const expenseAttachmentRepository = {
  create(data: ExpenseAttachmentData): Promise<StoredAttachment> {
    return db().expenseAttachment.create({ data, select: SELECT });
  },

  findById(id: string): Promise<StoredAttachment | null> {
    return db().expenseAttachment.findFirst({ where: { id, ...LIVE }, select: SELECT });
  },

  softDelete(id: string, actorId: string): Promise<StoredAttachment> {
    return db().expenseAttachment.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: actorId },
      select: SELECT,
    });
  },
};
