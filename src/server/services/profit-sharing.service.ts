import { cacheLife, cacheTag } from 'next/cache';

import { CACHE_TAG, REFERENCE_CACHE_LIFE } from '@/server/cache-tags';
import { AuditAction } from '@/generated/prisma/enums';
import { AUDIT_ENTITY, FULL_SPLIT_PERCENT } from '@/lib/constants';
import { Decimal, sumDecimals } from '@/lib/decimal';
import { MESSAGES } from '@/lib/messages';
import { NotFoundError, RuleViolationError } from '@/server/errors';
import { auditedChange, auditedCreate } from '@/server/repositories/audited-write';
import {
  type PartnerRecord,
  type ReserveRuleRecord,
  type SplitVersionRecord,
  partnerRepository,
  reserveRuleRepository,
  splitVersionRepository,
} from '@/server/repositories/profit-sharing.repository';
import type { ReserveRuleInput, SplitVersionInput } from '@/server/validators/settings.schema';
import type { SessionUser } from '@/types/auth';

export type ProfitSharingSettings = {
  partners: PartnerRecord[];
  splitVersions: SplitVersionRecord[];
  reserveRules: ReserveRuleRecord[];
};

export async function getProfitSharingSettings(): Promise<ProfitSharingSettings> {
  'use cache';
  cacheTag(CACHE_TAG.SETTINGS);
  cacheLife(REFERENCE_CACHE_LIFE);
  const [partners, splitVersions, reserveRules] = await Promise.all([
    partnerRepository.list(),
    splitVersionRepository.list(),
    reserveRuleRepository.list(),
  ]);
  return { partners, splitVersions, reserveRules };
}

export function addPartner(actor: SessionUser, name: string): Promise<PartnerRecord> {
  return auditedCreate(actor.id, AUDIT_ENTITY.PARTNER, () => partnerRepository.create(name));
}

export async function updatePartner(
  actor: SessionUser,
  input: { id: string; name: string; active: boolean },
): Promise<PartnerRecord> {
  return auditedChange(actor.id, {
    action: AuditAction.UPDATE,
    entityType: AUDIT_ENTITY.PARTNER,
    entityId: input.id,
    loadBefore: () => partnerRepository.findById(input.id),
    apply: () => partnerRepository.update(input.id, { name: input.name, active: input.active }),
  });
}

/** PRD §5.5: splits must total 100%; a new split applies from the month the founder picks. */
export async function saveSplitVersion(
  actor: SessionUser,
  input: SplitVersionInput,
): Promise<void> {
  const total = sumDecimals(input.shares.map((share) => new Decimal(share.splitPercent)));
  if (!total.equals(FULL_SPLIT_PERCENT))
    throw new RuleViolationError(MESSAGES.SETTINGS.SPLIT_MUST_TOTAL_100);
  const partnerIds = new Set((await partnerRepository.list()).map((partner) => partner.id));
  if (input.shares.some((share) => !partnerIds.has(share.partnerId))) throw new NotFoundError();
  await auditedChange(actor.id, {
    action: AuditAction.UPDATE,
    entityType: AUDIT_ENTITY.PROFIT_SPLIT,
    entityId: input.effectiveFrom,
    loadBefore: async () =>
      (await splitVersionRepository.list()).find(
        (version) => version.effectiveFrom === input.effectiveFrom,
      ) ?? null,
    apply: () => splitVersionRepository.replace(input.effectiveFrom, input.shares),
  });
}

export async function saveReserveRule(actor: SessionUser, input: ReserveRuleInput): Promise<void> {
  await auditedChange(actor.id, {
    action: AuditAction.UPDATE,
    entityType: AUDIT_ENTITY.RESERVE_RULE,
    entityId: input.effectiveFrom,
    loadBefore: async () =>
      (await reserveRuleRepository.list()).find(
        (rule) => rule.effectiveFrom === input.effectiveFrom,
      ) ?? null,
    apply: () =>
      reserveRuleRepository.upsert(input.effectiveFrom, {
        enabled: input.enabled,
        reservePercent: input.reservePercent,
        appliesInLossMonth: input.appliesInLossMonth,
      }),
  });
}
