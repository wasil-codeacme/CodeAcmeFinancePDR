import { z } from 'zod';

import { Frequency, FundingSource, SalesChannel } from '@/generated/prisma/enums';
import { MAX_ATTACHMENT_BYTES, MAX_DAY_OF_MONTH } from '@/lib/constants';
import { MESSAGES } from '@/lib/messages';
import {
  currencyCodeSchema,
  idSchema,
  isoDateSchema,
  monthKeySchema,
  nameSchema,
  optionalIdSchema,
  optionalIsoDateSchema,
  optionalTextSchema,
  positiveMoneySchema,
} from '@/server/validators/common.schema';

/** Empty or missing means "not tagged"; only sales expenses keep a tag (the service checks). */
const optionalSalesChannelSchema = z
  .union([z.enum(SalesChannel), z.literal(''), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

const expenseFieldsSchema = z.object({
  categoryId: idSchema,
  item: nameSchema,
  payeeTeamMemberId: optionalIdSchema,
  amount: positiveMoneySchema,
  currency: currencyCodeSchema,
  fundingSource: z.enum(FundingSource),
  fundingPartnerId: optionalIdSchema,
  paidFromAccountId: optionalIdSchema,
  salesChannel: optionalSalesChannelSchema,
  notes: optionalTextSchema,
});

const FUNDING_PARTNER_RULE = {
  path: ['fundingPartnerId'],
  message: 'Pick the partner who funded this expense.',
};

function namesFundingPartnerWhenExternal(expense: {
  fundingSource: FundingSource;
  fundingPartnerId: string | null;
}) {
  return expense.fundingSource === FundingSource.COMPANY || expense.fundingPartnerId !== null;
}

export const expenseSchema = expenseFieldsSchema
  .extend({ expenseDate: isoDateSchema, paidOn: optionalIsoDateSchema })
  .refine(namesFundingPartnerWhenExternal, FUNDING_PARTNER_RULE);
export type ExpenseInput = z.infer<typeof expenseSchema>;

export const updateExpenseSchema = expenseFieldsSchema
  .extend({ id: idSchema, expenseDate: isoDateSchema, paidOn: optionalIsoDateSchema })
  .refine(namesFundingPartnerWhenExternal, FUNDING_PARTNER_RULE);
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

export const expenseIdSchema = z.object({ id: idSchema });
export const expenseMonthSchema = z.object({ month: monthKeySchema });

export const recurringTemplateSchema = expenseFieldsSchema
  .extend({
    frequency: z.enum(Frequency),
    dayOfMonth: z.number().int().min(1).max(MAX_DAY_OF_MONTH),
    startMonth: monthKeySchema,
    endMonth: monthKeySchema.nullable(),
    active: z.boolean(),
  })
  .refine(namesFundingPartnerWhenExternal, FUNDING_PARTNER_RULE)
  .refine((template) => template.endMonth === null || template.endMonth >= template.startMonth, {
    path: ['endMonth'],
    message: 'End month must be after the start month.',
  });
export type RecurringTemplateInput = z.infer<typeof recurringTemplateSchema>;

export const updateRecurringTemplateSchema = z.object({
  id: idSchema,
  template: recurringTemplateSchema,
});

export const addAttachmentSchema = z.object({
  expenseId: idSchema,
  file: z
    .instanceof(File, { message: MESSAGES.EXPENSE.ATTACHMENT_REQUIRED })
    .refine((file) => file.size > 0, MESSAGES.EXPENSE.ATTACHMENT_REQUIRED)
    .refine((file) => file.size <= MAX_ATTACHMENT_BYTES, MESSAGES.EXPENSE.ATTACHMENT_TOO_LARGE),
});

export const attachmentIdSchema = z.object({ id: idSchema });
