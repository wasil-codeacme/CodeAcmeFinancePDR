import { z } from 'zod';

import { Role } from '@/generated/prisma/enums';
import { LOGIN_CODE_LENGTH } from '@/lib/constants';
import { idSchema, nameSchema } from '@/server/validators/common.schema';

export const emailSchema = z.email('Enter a valid email.').trim();

export const requestLoginCodeSchema = z.object({ email: emailSchema });
export type RequestLoginCodeInput = z.infer<typeof requestLoginCodeSchema>;

export const verifyLoginCodeSchema = z.object({
  email: emailSchema,
  code: z
    .string()
    .trim()
    .regex(new RegExp(`^\\d{${LOGIN_CODE_LENGTH}}$`), 'Enter the 6-digit code.'),
});
export type VerifyLoginCodeInput = z.infer<typeof verifyLoginCodeSchema>;

export const inviteUserSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  role: z.enum(Role),
});
export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const changeUserRoleSchema = z.object({ userId: idSchema, role: z.enum(Role) });
export const removeUserSchema = z.object({ userId: idSchema });
