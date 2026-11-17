'use server';

import { z } from 'zod';

import { PERMISSION } from '@/lib/permissions';
import { writeAction } from '@/server/actions/action';
import { CACHE_TAG } from '@/server/cache-tags';
import * as companyService from '@/server/services/company.service';
import * as platformService from '@/server/services/platform.service';
import * as profitSharingService from '@/server/services/profit-sharing.service';
import * as settingsService from '@/server/services/settings.service';
import {
  accountSchema,
  commissionRuleSchema,
  companySchema,
  exchangeRateSchema,
  expenseCategorySchema,
  moveExpenseCategorySchema,
  partnerSchema,
  platformFeeSchema,
  platformSchema,
  reserveRuleSchema,
  splitVersionSchema,
  teamMemberSchema,
  updateAccountSchema,
  updateExpenseCategorySchema,
  updatePartnerSchema,
  updatePlatformSchema,
  updateTeamMemberSchema,
} from '@/server/validators/settings.schema';

const SETTINGS = PERMISSION.SETTINGS_MANAGE;
const SETTINGS_CACHE = [CACHE_TAG.SETTINGS] as const;
const DONE = true;

export const saveCompany = writeAction({
  schema: companySchema,
  permission: SETTINGS,
  invalidates: SETTINGS_CACHE,
  handler: async (input, actor) => (await companyService.saveCompany(actor, input)).id,
});

export const completeOnboarding = writeAction({
  schema: z.object({}),
  permission: SETTINGS,
  invalidates: SETTINGS_CACHE,
  handler: async (_input, actor) => {
    await companyService.completeOnboarding(actor);
    return DONE;
  },
});

export const addPartner = writeAction({
  schema: partnerSchema,
  permission: SETTINGS,
  invalidates: SETTINGS_CACHE,
  handler: async (input, actor) => (await profitSharingService.addPartner(actor, input.name)).id,
});

export const updatePartner = writeAction({
  schema: updatePartnerSchema,
  permission: SETTINGS,
  invalidates: SETTINGS_CACHE,
  handler: async (input, actor) => (await profitSharingService.updatePartner(actor, input)).id,
});

export const saveSplitVersion = writeAction({
  schema: splitVersionSchema,
  permission: SETTINGS,
  invalidates: SETTINGS_CACHE,
  handler: async (input, actor) => {
    await profitSharingService.saveSplitVersion(actor, input);
    return DONE;
  },
});

export const saveReserveRule = writeAction({
  schema: reserveRuleSchema,
  permission: SETTINGS,
  invalidates: SETTINGS_CACHE,
  handler: async (input, actor) => {
    await profitSharingService.saveReserveRule(actor, input);
    return DONE;
  },
});

export const saveCommissionRule = writeAction({
  schema: commissionRuleSchema,
  permission: SETTINGS,
  invalidates: SETTINGS_CACHE,
  handler: async (input, actor) => {
    await settingsService.saveCommissionRule(actor, input);
    return DONE;
  },
});

export const createAccount = writeAction({
  schema: accountSchema,
  permission: SETTINGS,
  invalidates: SETTINGS_CACHE,
  handler: async (input, actor) => (await settingsService.createAccount(actor, input)).id,
});

export const updateAccount = writeAction({
  schema: updateAccountSchema,
  permission: SETTINGS,
  invalidates: SETTINGS_CACHE,
  handler: async ({ id, ...input }, actor) =>
    (await settingsService.updateAccount(actor, id, input)).id,
});

export const createPlatform = writeAction({
  schema: platformSchema,
  permission: SETTINGS,
  invalidates: SETTINGS_CACHE,
  handler: async (input, actor) => (await platformService.createPlatform(actor, input)).id,
});

export const updatePlatform = writeAction({
  schema: updatePlatformSchema,
  permission: SETTINGS,
  invalidates: SETTINGS_CACHE,
  handler: async (input, actor) => (await platformService.updatePlatform(actor, input)).id,
});

export const setPlatformFee = writeAction({
  schema: platformFeeSchema,
  permission: SETTINGS,
  invalidates: SETTINGS_CACHE,
  handler: async (input, actor) => {
    await platformService.setPlatformFee(actor, input);
    return DONE;
  },
});

export const createExpenseCategory = writeAction({
  schema: expenseCategorySchema,
  permission: SETTINGS,
  invalidates: SETTINGS_CACHE,
  handler: async (input, actor) => (await settingsService.createExpenseCategory(actor, input)).id,
});

export const updateExpenseCategory = writeAction({
  schema: updateExpenseCategorySchema,
  permission: SETTINGS,
  invalidates: SETTINGS_CACHE,
  handler: async ({ id, ...input }, actor) =>
    (await settingsService.updateExpenseCategory(actor, id, input)).id,
});

export const moveExpenseCategory = writeAction({
  schema: moveExpenseCategorySchema,
  permission: SETTINGS,
  invalidates: SETTINGS_CACHE,
  handler: async (input, actor) => {
    await settingsService.moveExpenseCategory(actor, input.id, input.direction);
    return DONE;
  },
});

export const createTeamMember = writeAction({
  schema: teamMemberSchema,
  permission: SETTINGS,
  invalidates: SETTINGS_CACHE,
  handler: async (input, actor) => (await settingsService.createTeamMember(actor, input)).id,
});

export const updateTeamMember = writeAction({
  schema: updateTeamMemberSchema,
  permission: SETTINGS,
  invalidates: SETTINGS_CACHE,
  handler: async ({ id, ...input }, actor) =>
    (await settingsService.updateTeamMember(actor, id, input)).id,
});

export const saveExchangeRate = writeAction({
  schema: exchangeRateSchema,
  permission: SETTINGS,
  invalidates: SETTINGS_CACHE,
  handler: async (input, actor) => (await settingsService.saveExchangeRate(actor, input)).id,
});
