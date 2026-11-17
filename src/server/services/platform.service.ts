import { cacheLife, cacheTag } from 'next/cache';

import { CACHE_TAG, REFERENCE_CACHE_LIFE } from '@/server/cache-tags';
import { AuditAction } from '@/generated/prisma/enums';
import { AUDIT_ENTITY } from '@/lib/constants';
import { auditedChange, auditedCreate } from '@/server/repositories/audited-write';
import { type PlatformRecord, platformRepository } from '@/server/repositories/platform.repository';
import type { PlatformFeeInput, PlatformInput } from '@/server/validators/settings.schema';
import type { SessionUser } from '@/types/auth';

export async function listPlatforms(): Promise<PlatformRecord[]> {
  'use cache';
  cacheTag(CACHE_TAG.SETTINGS);
  cacheLife(REFERENCE_CACHE_LIFE);
  return platformRepository.list();
}

export function createPlatform(actor: SessionUser, input: PlatformInput): Promise<PlatformRecord> {
  return auditedCreate(actor.id, AUDIT_ENTITY.PLATFORM, () => platformRepository.create(input));
}

export function updatePlatform(
  actor: SessionUser,
  input: { id: string; name: string; active: boolean },
): Promise<PlatformRecord> {
  return auditedChange(actor.id, {
    action: AuditAction.UPDATE,
    entityType: AUDIT_ENTITY.PLATFORM,
    entityId: input.id,
    loadBefore: () => platformRepository.findById(input.id),
    apply: () => platformRepository.update(input.id, { name: input.name, active: input.active }),
  });
}

/** A new default fee applies to entries booked from `effectiveFrom`; existing entries keep theirs. */
export function setPlatformFee(
  actor: SessionUser,
  input: PlatformFeeInput,
): Promise<PlatformRecord | null> {
  return auditedChange(actor.id, {
    action: AuditAction.UPDATE,
    entityType: AUDIT_ENTITY.PLATFORM_FEE,
    entityId: input.platformId,
    loadBefore: () => platformRepository.findById(input.platformId),
    apply: async () => {
      await platformRepository.setFee(input.platformId, input.effectiveFrom, input.feePercent);
      return platformRepository.findById(input.platformId);
    },
  });
}
