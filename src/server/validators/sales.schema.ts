import { z } from 'zod';

import { SalesChannel } from '@/generated/prisma/enums';
import { MAX_ACTIVITY_COUNT } from '@/lib/constants';
import { monthKeySchema } from '@/server/validators/common.schema';

const countSchema = z.number().int().min(0).max(MAX_ACTIVITY_COUNT);

export const salesActivitySchema = z.object({
  month: monthKeySchema,
  channel: z.enum(SalesChannel),
  interestedResponses: countSchema,
  leadsClosed: countSchema,
  callsMade: countSchema,
});
export type SalesActivityInput = z.infer<typeof salesActivitySchema>;
