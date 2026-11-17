import { AuditAction } from '@/generated/prisma/enums';
import type { AuditEntity } from '@/lib/constants';
import { auditRepository } from '@/server/repositories/audit.repository';
import { runInTransaction } from '@/server/repositories/db';

/**
 * PRD §7: every create, edit and delete is logged with before/after values. The write and
 * its audit entry share one transaction so neither can exist without the other.
 */
export function auditedCreate<TRecord extends { id: string }>(
  actorUserId: string,
  entityType: AuditEntity,
  create: () => Promise<TRecord>,
): Promise<TRecord> {
  return runInTransaction(async () => {
    const created = await create();
    await auditRepository.record({
      actorUserId,
      action: AuditAction.CREATE,
      entityType,
      entityId: created.id,
      after: created,
    });
    return created;
  });
}

export function auditedChange<TRecord>(
  actorUserId: string,
  change: {
    action: typeof AuditAction.UPDATE | typeof AuditAction.DELETE;
    entityType: AuditEntity;
    entityId: string;
    loadBefore: () => Promise<unknown>;
    apply: () => Promise<TRecord>;
  },
): Promise<TRecord> {
  return runInTransaction(async () => {
    const before = await change.loadBefore();
    const after = await change.apply();
    await auditRepository.record({
      actorUserId,
      action: change.action,
      entityType: change.entityType,
      entityId: change.entityId,
      before,
      after,
    });
    return after;
  });
}
