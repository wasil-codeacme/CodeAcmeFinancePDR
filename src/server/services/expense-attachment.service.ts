import { AuditAction } from '@/generated/prisma/enums';
import { AUDIT_ENTITY } from '@/lib/constants';
import { MESSAGES } from '@/lib/messages';
import { PERMISSION, hasPermission } from '@/lib/permissions';
import { fileStorage } from '@/server/container';
import { detectAttachmentType, safeFileName } from '@/server/domain/file-type';
import { ForbiddenError, NotFoundError, RuleViolationError } from '@/server/errors';
import { auditedChange, auditedCreate } from '@/server/repositories/audited-write';
import { expenseAttachmentRepository } from '@/server/repositories/expense-attachment.repository';
import { expenseRepository } from '@/server/repositories/expense.repository';
import type { SessionUser } from '@/types/auth';
import type { ExpenseAttachmentRecord } from '@/types/expense';

type Upload = { expenseId: string; fileName: string; data: Uint8Array<ArrayBuffer> };

/**
 * PRD §5.3: attach a receipt or invoice to any expense. The type comes from the file's
 * bytes, never from its name. A file explains a figure without changing it, so closed
 * months accept attachments too.
 */
export async function addExpenseAttachment(
  actor: SessionUser,
  upload: Upload,
): Promise<ExpenseAttachmentRecord> {
  if (!(await expenseRepository.findById(upload.expenseId))) throw new NotFoundError();
  const contentType = detectAttachmentType(upload.data);
  if (!contentType) throw new RuleViolationError(MESSAGES.EXPENSE.ATTACHMENT_TYPE);
  const attachment = await auditedCreate(actor.id, AUDIT_ENTITY.EXPENSE_ATTACHMENT, async () =>
    expenseAttachmentRepository.create({
      expenseId: upload.expenseId,
      storageKey: await fileStorage.save({ data: upload.data, contentType }),
      fileName: safeFileName(upload.fileName),
      contentType,
      size: upload.data.byteLength,
      createdById: actor.id,
    }),
  );
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    contentType: attachment.contentType,
    size: attachment.size,
  };
}

/** Soft delete: the file stays in storage and in the audit log. */
export async function removeExpenseAttachment(actor: SessionUser, id: string): Promise<void> {
  await auditedChange(actor.id, {
    action: AuditAction.DELETE,
    entityType: AUDIT_ENTITY.EXPENSE_ATTACHMENT,
    entityId: id,
    loadBefore: async () => {
      const attachment = await expenseAttachmentRepository.findById(id);
      if (!attachment) throw new NotFoundError();
      return attachment;
    },
    apply: () => expenseAttachmentRepository.softDelete(id, actor.id),
  });
}

/** The bytes to download, for anyone who keeps or reads the books. */
export async function getExpenseAttachmentFile(user: SessionUser, id: string) {
  const canRead =
    hasPermission(user.role, PERMISSION.ENTRIES_WRITE) ||
    hasPermission(user.role, PERMISSION.REPORTS_VIEW);
  if (!canRead) throw new ForbiddenError();
  const attachment = await expenseAttachmentRepository.findById(id);
  if (!attachment) throw new NotFoundError();
  const stored = await fileStorage.read(attachment.storageKey);
  if (!stored) throw new NotFoundError();
  return { fileName: attachment.fileName, contentType: attachment.contentType, data: stored.data };
}
