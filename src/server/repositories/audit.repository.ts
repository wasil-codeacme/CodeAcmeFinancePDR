import { type AuditAction, Prisma } from '@/generated/prisma/client';
import type { AuditEntity } from '@/lib/constants';
import { db } from '@/server/repositories/db';

export type AuditEntry = {
  actorUserId: string | null;
  action: AuditAction;
  entityType: AuditEntity;
  entityId: string;
  before?: unknown;
  after?: unknown;
};

/** Snapshots a record as plain JSON (Decimals and Dates become strings). */
function toJsonSnapshot(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (value === undefined || value === null) return Prisma.DbNull;
  const snapshot: unknown = JSON.parse(JSON.stringify(value));
  // JSON.parse of JSON.stringify output is by construction a JSON value.
  return snapshot as Prisma.InputJsonValue;
}

export const auditRepository = {
  async record(entry: AuditEntry): Promise<void> {
    await db().auditLog.create({
      data: {
        actorUserId: entry.actorUserId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        before: toJsonSnapshot(entry.before),
        after: toJsonSnapshot(entry.after),
      },
    });
  },
};
