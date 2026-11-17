import { z } from 'zod';

import { AdjustmentKind, InvoiceStatus, ProjectStatus } from '@/generated/prisma/enums';
import { MAX_NAME_LENGTH } from '@/lib/constants';
import {
  idSchema,
  isoDateSchema,
  moneySchema,
  monthKeySchema,
  nameSchema,
  optionalIdSchema,
  optionalShortTextSchema,
  optionalTextSchema,
  percentSchema,
  positiveMoneySchema,
} from '@/server/validators/common.schema';

/** PRD §5.1: four inputs add revenue — client or project, gross, month, status. */
export const createRevenueSchema = z.object({
  clientId: idSchema,
  projectId: optionalIdSchema,
  gross: moneySchema,
  bookingMonth: monthKeySchema,
  projectStatus: z.enum(ProjectStatus),
});
export type CreateRevenueInput = z.infer<typeof createRevenueSchema>;

/** Inline edits send only the changed columns. */
export const updateRevenueSchema = z.object({
  id: idSchema,
  gross: moneySchema.optional(),
  feePercent: percentSchema.optional(),
  projectStatus: z.enum(ProjectStatus).optional(),
  invoiceStatus: z.enum(InvoiceStatus).optional(),
  referredBy: optionalShortTextSchema,
  platformId: optionalIdSchema,
  closedByTeamMemberId: optionalIdSchema,
  notes: optionalTextSchema,
});
export type UpdateRevenueInput = z.infer<typeof updateRevenueSchema>;

export const revenueIdSchema = z.object({ id: idSchema });
export const copyRevenueSchema = z.object({ month: monthKeySchema });

export const recordReceiptSchema = z
  .object({
    revenueEntryId: idSchema,
    receivedOn: isoDateSchema,
    amount: positiveMoneySchema,
    accountId: optionalIdSchema,
    isEscrow: z.boolean(),
  })
  .refine((receipt) => receipt.isEscrow || receipt.accountId !== null, {
    path: ['accountId'],
    message: 'Pick the account the money landed in.',
  });
export type RecordReceiptInput = z.infer<typeof recordReceiptSchema>;

export const releaseEscrowSchema = z.object({
  receiptId: idSchema,
  receivedOn: isoDateSchema,
  accountId: idSchema,
});
export type ReleaseEscrowInput = z.infer<typeof releaseEscrowSchema>;

export const adjustReceivableSchema = z
  .object({
    revenueEntryId: idSchema,
    kind: z.enum(AdjustmentKind),
    amount: positiveMoneySchema.optional(),
    adjustedOn: isoDateSchema,
    reason: z.string().trim().min(3, 'Say why.').max(MAX_NAME_LENGTH),
  })
  .refine(
    (adjustment) => adjustment.kind === AdjustmentKind.WRITE_OFF || adjustment.amount !== undefined,
    {
      path: ['amount'],
      message: 'Enter the amount to reduce by.',
    },
  );
export type AdjustReceivableInput = z.infer<typeof adjustReceivableSchema>;

export const moveExpectedDateSchema = z.object({
  revenueEntryId: idSchema,
  expectedDate: isoDateSchema,
});

export const standaloneReceivableSchema = z.object({
  clientId: idSchema,
  description: nameSchema,
  amount: positiveMoneySchema,
  bookingMonth: monthKeySchema,
  expectedDate: isoDateSchema,
});
export type StandaloneReceivableInput = z.infer<typeof standaloneReceivableSchema>;

export const receiptIdSchema = z.object({ receiptId: idSchema });
