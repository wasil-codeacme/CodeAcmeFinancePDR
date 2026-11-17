import { z } from 'zod';

import { AccountType, CommissionBase, PnlLine, TeamMemberType } from '@/generated/prisma/enums';
import {
  currencyCodeSchema,
  idSchema,
  moneySchema,
  monthKeySchema,
  nameSchema,
  optionalIdSchema,
  optionalShortTextSchema,
  percentSchema,
  rateSchema,
} from '@/server/validators/common.schema';

export const companySchema = z
  .object({
    name: nameSchema,
    reportingCurrency: currencyCodeSchema,
    displayCurrency: currencyCodeSchema,
  })
  .refine((company) => company.reportingCurrency !== company.displayCurrency, {
    path: ['displayCurrency'],
    message: 'Reporting and display currency must differ.',
  });
export type CompanyInput = z.infer<typeof companySchema>;

export const partnerSchema = z.object({ name: nameSchema });
export const updatePartnerSchema = z.object({
  id: idSchema,
  name: nameSchema,
  active: z.boolean(),
});

export const splitVersionSchema = z.object({
  effectiveFrom: monthKeySchema,
  shares: z.array(z.object({ partnerId: idSchema, splitPercent: percentSchema })).min(1),
});
export type SplitVersionInput = z.infer<typeof splitVersionSchema>;

export const reserveRuleSchema = z.object({
  effectiveFrom: monthKeySchema,
  enabled: z.boolean(),
  reservePercent: percentSchema,
  appliesInLossMonth: z.boolean(),
});
export type ReserveRuleInput = z.infer<typeof reserveRuleSchema>;

export const commissionRuleSchema = z.object({
  effectiveFrom: monthKeySchema,
  ratePercent: percentSchema,
  base: z.enum(CommissionBase),
});
export type CommissionRuleInput = z.infer<typeof commissionRuleSchema>;

export const accountSchema = z.object({
  name: nameSchema,
  type: z.enum(AccountType),
  currency: currencyCodeSchema,
  ownerLabel: optionalShortTextSchema,
  openingBalance: moneySchema,
  openingBalanceMonth: monthKeySchema,
  active: z.boolean(),
});
export type AccountInput = z.infer<typeof accountSchema>;
export const updateAccountSchema = accountSchema.extend({ id: idSchema });

export const platformSchema = z.object({
  name: nameSchema,
  feePercent: percentSchema,
  effectiveFrom: monthKeySchema,
});
export type PlatformInput = z.infer<typeof platformSchema>;
export const updatePlatformSchema = z.object({
  id: idSchema,
  name: nameSchema,
  active: z.boolean(),
});
export const platformFeeSchema = z.object({
  platformId: idSchema,
  feePercent: percentSchema,
  effectiveFrom: monthKeySchema,
});
export type PlatformFeeInput = z.infer<typeof platformFeeSchema>;

export const expenseCategorySchema = z.object({
  name: nameSchema,
  pnlLine: z.enum(PnlLine),
  active: z.boolean(),
});
export type ExpenseCategoryInput = z.infer<typeof expenseCategorySchema>;
export const updateExpenseCategorySchema = expenseCategorySchema.extend({ id: idSchema });
export const moveExpenseCategorySchema = z.object({
  id: idSchema,
  direction: z.enum(['UP', 'DOWN']),
});

export const teamMemberSchema = z.object({
  name: nameSchema,
  type: z.enum(TeamMemberType),
  defaultCategoryId: optionalIdSchema,
  earnsCommission: z.boolean(),
  active: z.boolean(),
});
export type TeamMemberInput = z.infer<typeof teamMemberSchema>;
export const updateTeamMemberSchema = teamMemberSchema.extend({ id: idSchema });

export const exchangeRateSchema = z.object({ month: monthKeySchema, rate: rateSchema });
export type ExchangeRateInput = z.infer<typeof exchangeRateSchema>;
