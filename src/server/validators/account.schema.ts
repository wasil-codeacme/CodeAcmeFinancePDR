import { z } from 'zod';

import { MESSAGES } from '@/lib/messages';
import {
  idSchema,
  isoDateSchema,
  moneySchema,
  monthKeySchema,
  optionalIdSchema,
  optionalTextSchema,
  positiveMoneySchema,
} from '@/server/validators/common.schema';

export const closingBalanceSchema = z.object({
  accountId: idSchema,
  month: monthKeySchema,
  closingBalance: moneySchema,
});
export type ClosingBalanceInput = z.infer<typeof closingBalanceSchema>;

const optionalMoneySchema = z
  .union([z.literal(''), moneySchema, z.null()])
  .optional()
  .transform((value) => (value ? value : null));

export const transferSchema = z
  .object({
    fromAccountId: idSchema,
    toAccountId: idSchema,
    transferredOn: isoDateSchema,
    amount: positiveMoneySchema,
    receivedAmount: optionalMoneySchema,
    fee: optionalMoneySchema,
    feeCategoryId: optionalIdSchema,
    note: optionalTextSchema,
  })
  .refine((transfer) => transfer.fromAccountId !== transfer.toAccountId, {
    path: ['toAccountId'],
    message: MESSAGES.ACCOUNT.SAME_ACCOUNT,
  })
  .refine((transfer) => !transfer.fee || Number(transfer.fee) === 0 || transfer.feeCategoryId, {
    path: ['feeCategoryId'],
    message: MESSAGES.ACCOUNT.FEE_CATEGORY_REQUIRED,
  });
export type TransferInput = z.infer<typeof transferSchema>;

export const transferIdSchema = z.object({ id: idSchema });
