import { z } from 'zod';

import { MAX_NAME_LENGTH } from '@/lib/constants';
import {
  idSchema,
  monthKeySchema,
  optionalTextSchema,
  positiveMoneySchema,
} from '@/server/validators/common.schema';

export const monthSchema = z.object({ month: monthKeySchema });

export const reopenMonthSchema = z.object({
  month: monthKeySchema,
  reason: z.string().trim().min(3, 'Say why the month is being reopened.').max(MAX_NAME_LENGTH),
});

export const nextMonthReserveSchema = z.object({
  month: monthKeySchema,
  amount: positiveMoneySchema,
  note: optionalTextSchema,
});

export const reserveIdSchema = z.object({ id: idSchema });
