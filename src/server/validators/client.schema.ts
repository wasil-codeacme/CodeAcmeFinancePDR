import { z } from 'zod';

import { ProjectStatus } from '@/generated/prisma/enums';
import {
  idSchema,
  nameSchema,
  optionalIdSchema,
  percentSchema,
} from '@/server/validators/common.schema';

/** Blank means "use the default", so it is stored as null rather than 0%. */
const optionalPercentSchema = z
  .union([z.literal(''), percentSchema, z.null()])
  .optional()
  .transform((value) => (value ? value : null));

export const clientSchema = z.object({
  name: nameSchema,
  defaultPlatformId: optionalIdSchema,
  defaultFeePercent: optionalPercentSchema,
  active: z.boolean(),
});
export type ClientInput = z.infer<typeof clientSchema>;
export const updateClientSchema = clientSchema.extend({ id: idSchema });

export const projectSchema = z.object({
  clientId: idSchema,
  name: nameSchema,
  platformId: optionalIdSchema,
  feePercentOverride: optionalPercentSchema,
  status: z.enum(ProjectStatus),
  active: z.boolean(),
});
export type ProjectInput = z.infer<typeof projectSchema>;
export const updateProjectSchema = projectSchema.extend({ id: idSchema });
