'use server';

import { redirect } from 'next/navigation';

import { MESSAGES } from '@/lib/messages';
import { ROUTES } from '@/lib/routes';
import { mapError } from '@/server/actions/action';
import {
  clearSessionCookie,
  readSessionToken,
  writeSessionCookie,
} from '@/server/auth/session-cookie';
import * as authService from '@/server/services/auth.service';
import {
  type RequestLoginCodeInput,
  type VerifyLoginCodeInput,
  requestLoginCodeSchema,
  verifyLoginCodeSchema,
} from '@/server/validators/user.schema';
import type { ActionResponse } from '@/types/action-response';

export async function requestLoginCode(
  input: RequestLoginCodeInput,
): Promise<ActionResponse<true>> {
  const parsed = requestLoginCodeSchema.safeParse(input);
  if (!parsed.success) return { error: MESSAGES.COMMON.VALIDATION_ERROR };
  try {
    await authService.requestLoginCode(parsed.data.email);
    return { data: true };
  } catch (error) {
    return { error: mapError(error) };
  }
}

export async function verifyLoginCode(input: VerifyLoginCodeInput): Promise<ActionResponse<true>> {
  const parsed = verifyLoginCodeSchema.safeParse(input);
  if (!parsed.success) return { error: MESSAGES.AUTH.CODE_INVALID };
  try {
    const session = await authService.verifyLoginCode(parsed.data.email, parsed.data.code);
    await writeSessionCookie(session.token, session.expiresAt);
  } catch (error) {
    return { error: mapError(error) };
  }
  redirect(ROUTES.HOME);
}

export async function signOut(): Promise<void> {
  const token = await readSessionToken();
  if (token) await authService.endSession(token);
  await clearSessionCookie();
  redirect(ROUTES.AUTH.LOGIN);
}
