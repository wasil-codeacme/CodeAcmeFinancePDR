import { z } from 'zod';

import {
  idSchema,
  isoDateSchema,
  optionalIdSchema,
  optionalTextSchema,
  positiveMoneySchema,
} from '@/server/validators/common.schema';

/** A withdrawal or a partner's funding: who, when, how much, and through which account. */
export const ledgerMovementSchema = z.object({
  partnerId: idSchema,
  occurredOn: isoDateSchema,
  amount: positiveMoneySchema,
  accountId: optionalIdSchema,
  note: optionalTextSchema,
});
export type LedgerMovementInput = z.infer<typeof ledgerMovementSchema>;

export const ledgerEntryIdSchema = z.object({ id: idSchema });
