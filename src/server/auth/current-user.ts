import 'server-only';

import { notFound, redirect } from 'next/navigation';
import { connection } from 'next/server';
import { cache } from 'react';

import { type Permission, hasPermission } from '@/lib/permissions';
import { ROUTES } from '@/lib/routes';
import { readSessionToken } from '@/server/auth/session-cookie';
import { findSessionUser } from '@/server/services/auth.service';
import { isOnboardingComplete } from '@/server/services/company.service';
import type { SessionUser } from '@/types/auth';

/** Reads and validates the session once per request (Data Access Layer pattern). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = await readSessionToken();
  if (!token) return null;
  // Session expiry compares against the clock, so mark the render as request-time first.
  await connection();
  return findSessionUser(token);
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(ROUTES.AUTH.LOGIN);
  return user;
}

/**
 * For pages that need a permission. A user without it gets a 404 rather than a 403 so
 * founder-only pages do not reveal that they exist.
 */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasPermission(user.role, permission)) notFound();
  return user;
}

/** Book-keeping pages need the business set up first; founders are sent to onboarding. */
export async function requireBooksUser(permission: Permission): Promise<SessionUser> {
  const user = await requirePermission(permission);
  if (!(await isOnboardingComplete())) redirect(ROUTES.ONBOARDING);
  return user;
}
