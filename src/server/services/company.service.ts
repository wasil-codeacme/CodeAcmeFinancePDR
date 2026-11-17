import { cacheLife, cacheTag } from 'next/cache';

import { CACHE_TAG, REFERENCE_CACHE_LIFE } from '@/server/cache-tags';
import { AuditAction } from '@/generated/prisma/enums';
import { AUDIT_ENTITY } from '@/lib/constants';
import { MESSAGES } from '@/lib/messages';
import { RuleViolationError } from '@/server/errors';
import { auditedChange } from '@/server/repositories/audited-write';
import { type CompanyRecord, companyRepository } from '@/server/repositories/company.repository';
import {
  splitVersionRepository,
  reserveRuleRepository,
} from '@/server/repositories/profit-sharing.repository';
import { platformRepository } from '@/server/repositories/platform.repository';
import {
  accountRepository,
  exchangeRateRepository,
  expenseCategoryRepository,
} from '@/server/repositories/settings.repository';
import type { CompanyInput } from '@/server/validators/settings.schema';
import type { OnboardingStatus } from '@/types/onboarding';
import type { SessionUser } from '@/types/auth';

export async function getCompany(): Promise<CompanyRecord | null> {
  'use cache';
  cacheTag(CACHE_TAG.SETTINGS);
  cacheLife(REFERENCE_CACHE_LIFE);
  return companyRepository.find();
}

export async function isOnboardingComplete(): Promise<boolean> {
  'use cache';
  cacheTag(CACHE_TAG.SETTINGS);
  cacheLife(REFERENCE_CACHE_LIFE);
  return Boolean((await companyRepository.find())?.onboardingCompletedAt);
}

export async function saveCompany(actor: SessionUser, input: CompanyInput): Promise<CompanyRecord> {
  const existing = await companyRepository.find();
  const currenciesChanged =
    existing &&
    (existing.reportingCurrency !== input.reportingCurrency ||
      existing.displayCurrency !== input.displayCurrency);
  if (currenciesChanged && (await companyRepository.hasAnyEntries())) {
    throw new RuleViolationError(MESSAGES.SETTINGS.CURRENCIES_LOCKED);
  }
  return auditedChange(actor.id, {
    action: AuditAction.UPDATE,
    entityType: AUDIT_ENTITY.COMPANY,
    entityId: existing?.id ?? AUDIT_ENTITY.COMPANY,
    loadBefore: async () => existing,
    apply: () => companyRepository.upsert(input),
  });
}

/** What the founder still has to set up before the books can be used (PRD §5.5). */
export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  const [company, splits, reserveRules, accounts, platforms, categories, rates] = await Promise.all(
    [
      companyRepository.find(),
      splitVersionRepository.list(),
      reserveRuleRepository.list(),
      accountRepository.list(),
      platformRepository.list(),
      expenseCategoryRepository.list(),
      exchangeRateRepository.list(),
    ],
  );
  return {
    company: company !== null,
    partners: splits.length > 0,
    reserveRule: reserveRules.length > 0,
    accounts: accounts.length > 0,
    platforms: platforms.length > 0,
    categories: categories.length > 0,
    exchangeRate: rates.length > 0,
    completedAt: company?.onboardingCompletedAt ?? null,
  };
}

export async function completeOnboarding(actor: SessionUser): Promise<void> {
  const status = await getOnboardingStatus();
  const requiredDone =
    status.company &&
    status.partners &&
    status.reserveRule &&
    status.accounts &&
    status.platforms &&
    status.categories &&
    status.exchangeRate;
  if (!requiredDone) throw new RuleViolationError(MESSAGES.ONBOARDING.INCOMPLETE);
  if (status.completedAt) return;
  await auditedChange(actor.id, {
    action: AuditAction.UPDATE,
    entityType: AUDIT_ENTITY.COMPANY,
    entityId: AUDIT_ENTITY.COMPANY,
    loadBefore: () => companyRepository.find(),
    apply: () => companyRepository.markOnboardingComplete(new Date()),
  });
}
