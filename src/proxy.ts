import { type NextRequest, NextResponse } from 'next/server';

import { SESSION_COOKIE_NAME } from '@/lib/constants';
import { PUBLIC_ROUTES, ROUTES } from '@/lib/routes';

/**
 * Optimistic gate only: sends visitors without a session cookie to login. The real check
 * (is the session valid, may this user do this) happens server-side in every page and action.
 */
export function proxy(request: NextRequest) {
  const isPublic = PUBLIC_ROUTES.some((route) => request.nextUrl.pathname.startsWith(route));
  if (isPublic || request.cookies.has(SESSION_COOKIE_NAME)) return NextResponse.next();
  return NextResponse.redirect(new URL(ROUTES.AUTH.LOGIN, request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)'],
};
