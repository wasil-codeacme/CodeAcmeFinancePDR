import { cacheLife, cacheTag } from 'next/cache';

import { CACHE_TAG, REFERENCE_CACHE_LIFE } from '@/server/cache-tags';
import { AuditAction } from '@/generated/prisma/enums';
import { AUDIT_ENTITY } from '@/lib/constants';
import { auditedChange, auditedCreate } from '@/server/repositories/audited-write';
import {
  type ClientRecord,
  type ProjectRecord,
  clientRepository,
  projectRepository,
} from '@/server/repositories/client.repository';
import { revenueRepository } from '@/server/repositories/revenue.repository';
import { toRevenueRow } from '@/server/domain/revenue-view';
import type { ClientInput, ProjectInput } from '@/server/validators/client.schema';
import type { SessionUser } from '@/types/auth';
import type { RevenueRow } from '@/types/revenue';

export async function listClients(): Promise<ClientRecord[]> {
  'use cache';
  cacheTag(CACHE_TAG.CLIENTS);
  cacheLife(REFERENCE_CACHE_LIFE);
  return clientRepository.list();
}

export async function getClient(id: string): Promise<ClientRecord | null> {
  'use cache';
  cacheTag(CACHE_TAG.CLIENTS);
  cacheLife(REFERENCE_CACHE_LIFE);
  return clientRepository.findById(id);
}

/** PRD §5.1: a client page shows that client's history across months. */
export async function getClientHistory(clientId: string): Promise<RevenueRow[]> {
  return (await revenueRepository.listForClient(clientId)).map(toRevenueRow);
}

export function createClient(actor: SessionUser, input: ClientInput): Promise<ClientRecord> {
  return auditedCreate(actor.id, AUDIT_ENTITY.CLIENT, () => clientRepository.create(input));
}

export function updateClient(
  actor: SessionUser,
  id: string,
  input: ClientInput,
): Promise<ClientRecord> {
  return auditedChange(actor.id, {
    action: AuditAction.UPDATE,
    entityType: AUDIT_ENTITY.CLIENT,
    entityId: id,
    loadBefore: () => clientRepository.findById(id),
    apply: () => clientRepository.update(id, input),
  });
}

export function createProject(actor: SessionUser, input: ProjectInput): Promise<ProjectRecord> {
  return auditedCreate(actor.id, AUDIT_ENTITY.PROJECT, () => projectRepository.create(input));
}

export function updateProject(
  actor: SessionUser,
  id: string,
  input: ProjectInput,
): Promise<ProjectRecord> {
  return auditedChange(actor.id, {
    action: AuditAction.UPDATE,
    entityType: AUDIT_ENTITY.PROJECT,
    entityId: id,
    loadBefore: () => projectRepository.findById(id),
    apply: () => projectRepository.update(id, input),
  });
}
