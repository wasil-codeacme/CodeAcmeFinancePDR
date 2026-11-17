import { cacheLife, cacheTag } from 'next/cache';

import { CACHE_TAG, REFERENCE_CACHE_LIFE } from '@/server/cache-tags';
import { AuditAction } from '@/generated/prisma/enums';
import { AUDIT_ENTITY } from '@/lib/constants';
import { assertMonthsOpen } from '@/server/period-guard';
import { auditedChange, auditedCreate } from '@/server/repositories/audited-write';
import {
  type AccountRecord,
  type CommissionRuleRecord,
  type ExchangeRateRecord,
  type ExpenseCategoryRecord,
  type TeamMemberRecord,
  accountRepository,
  commissionRuleRepository,
  exchangeRateRepository,
  expenseCategoryRepository,
  teamMemberRepository,
} from '@/server/repositories/settings.repository';
import type {
  AccountInput,
  CommissionRuleInput,
  ExchangeRateInput,
  ExpenseCategoryInput,
  TeamMemberInput,
} from '@/server/validators/settings.schema';
import type { SessionUser } from '@/types/auth';

/**
 * Reference data founders maintain in Settings (PRD §5.5): accounts, categories, team,
 * commission rule and exchange rates. Each is a plain list with audited writes.
 */
export async function listAccounts(): Promise<AccountRecord[]> {
  'use cache';
  cacheTag(CACHE_TAG.SETTINGS);
  cacheLife(REFERENCE_CACHE_LIFE);
  return accountRepository.list();
}

export async function listExpenseCategories(): Promise<ExpenseCategoryRecord[]> {
  'use cache';
  cacheTag(CACHE_TAG.SETTINGS);
  cacheLife(REFERENCE_CACHE_LIFE);
  return expenseCategoryRepository.list();
}

export async function listTeamMembers(): Promise<TeamMemberRecord[]> {
  'use cache';
  cacheTag(CACHE_TAG.SETTINGS);
  cacheLife(REFERENCE_CACHE_LIFE);
  return teamMemberRepository.list();
}

export async function listCommissionRules(): Promise<CommissionRuleRecord[]> {
  'use cache';
  cacheTag(CACHE_TAG.SETTINGS);
  cacheLife(REFERENCE_CACHE_LIFE);
  return commissionRuleRepository.list();
}

export async function listExchangeRates(): Promise<ExchangeRateRecord[]> {
  'use cache';
  cacheTag(CACHE_TAG.SETTINGS);
  cacheLife(REFERENCE_CACHE_LIFE);
  return exchangeRateRepository.list();
}

export function createAccount(actor: SessionUser, input: AccountInput): Promise<AccountRecord> {
  return auditedCreate(actor.id, AUDIT_ENTITY.ACCOUNT, () => accountRepository.create(input));
}

export function updateAccount(
  actor: SessionUser,
  id: string,
  input: AccountInput,
): Promise<AccountRecord> {
  return auditedChange(actor.id, {
    action: AuditAction.UPDATE,
    entityType: AUDIT_ENTITY.ACCOUNT,
    entityId: id,
    loadBefore: () => accountRepository.findById(id),
    apply: () => accountRepository.update(id, input),
  });
}

export async function createExpenseCategory(
  actor: SessionUser,
  input: ExpenseCategoryInput,
): Promise<ExpenseCategoryRecord> {
  const sortOrder = await expenseCategoryRepository.nextSortOrder();
  return auditedCreate(actor.id, AUDIT_ENTITY.EXPENSE_CATEGORY, () =>
    expenseCategoryRepository.create({ ...input, sortOrder }),
  );
}

export function updateExpenseCategory(
  actor: SessionUser,
  id: string,
  input: ExpenseCategoryInput,
): Promise<ExpenseCategoryRecord> {
  return auditedChange(actor.id, {
    action: AuditAction.UPDATE,
    entityType: AUDIT_ENTITY.EXPENSE_CATEGORY,
    entityId: id,
    loadBefore: () => expenseCategoryRepository.findById(id),
    apply: () => expenseCategoryRepository.update(id, input),
  });
}

/** Swaps a category's display order with its neighbour. */
export async function moveExpenseCategory(
  actor: SessionUser,
  id: string,
  direction: 'UP' | 'DOWN',
): Promise<void> {
  const categories = await expenseCategoryRepository.list();
  const index = categories.findIndex((category) => category.id === id);
  const neighbour = categories[direction === 'UP' ? index - 1 : index + 1];
  const current = categories[index];
  if (!current || !neighbour) return;
  await auditedChange(actor.id, {
    action: AuditAction.UPDATE,
    entityType: AUDIT_ENTITY.EXPENSE_CATEGORY,
    entityId: id,
    loadBefore: async () => current,
    apply: async () => {
      await expenseCategoryRepository.update(neighbour.id, { sortOrder: current.sortOrder });
      return expenseCategoryRepository.update(current.id, { sortOrder: neighbour.sortOrder });
    },
  });
}

export function createTeamMember(
  actor: SessionUser,
  input: TeamMemberInput,
): Promise<TeamMemberRecord> {
  return auditedCreate(actor.id, AUDIT_ENTITY.TEAM_MEMBER, () =>
    teamMemberRepository.create(input),
  );
}

export function updateTeamMember(
  actor: SessionUser,
  id: string,
  input: TeamMemberInput,
): Promise<TeamMemberRecord> {
  return auditedChange(actor.id, {
    action: AuditAction.UPDATE,
    entityType: AUDIT_ENTITY.TEAM_MEMBER,
    entityId: id,
    loadBefore: () => teamMemberRepository.findById(id),
    apply: () => teamMemberRepository.update(id, input),
  });
}

export async function saveCommissionRule(
  actor: SessionUser,
  input: CommissionRuleInput,
): Promise<void> {
  await auditedChange(actor.id, {
    action: AuditAction.UPDATE,
    entityType: AUDIT_ENTITY.COMMISSION_RULE,
    entityId: input.effectiveFrom,
    loadBefore: async () =>
      (await commissionRuleRepository.list()).find(
        (rule) => rule.effectiveFrom === input.effectiveFrom,
      ) ?? null,
    apply: () =>
      commissionRuleRepository.upsert(input.effectiveFrom, {
        ratePercent: input.ratePercent,
        base: input.base,
        categoryId: input.categoryId,
      }),
  });
}

export async function saveExchangeRate(
  actor: SessionUser,
  input: ExchangeRateInput,
): Promise<ExchangeRateRecord> {
  await assertMonthsOpen(input.month);
  return auditedChange(actor.id, {
    action: AuditAction.UPDATE,
    entityType: AUDIT_ENTITY.EXCHANGE_RATE,
    entityId: input.month,
    loadBefore: () => exchangeRateRepository.findByMonth(input.month),
    apply: () => exchangeRateRepository.upsert(input.month, input.rate),
  });
}

export function findEffectiveExchangeRate(
  month: ExchangeRateInput['month'],
): Promise<ExchangeRateRecord | null> {
  return exchangeRateRepository.findEffective(month);
}
