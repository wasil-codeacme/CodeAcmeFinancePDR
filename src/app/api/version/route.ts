import { NextResponse } from 'next/server';
import { connection } from 'next/server';

import { MESSAGES } from '@/lib/messages';
import { getCurrentUser } from '@/server/auth/current-user';
import { getDataVersion } from '@/server/cached-reads';

const HTTP_UNAUTHORIZED = 401;

/** The books' data version, which open tabs poll to refresh only when something changed. */
export async function GET() {
  await connection();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: MESSAGES.COMMON.UNAUTHENTICATED },
      { status: HTTP_UNAUTHORIZED },
    );
  }
  return NextResponse.json(
    { data: { version: await getDataVersion() } },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
