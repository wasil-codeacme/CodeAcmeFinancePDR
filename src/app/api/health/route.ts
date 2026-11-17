import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { checkDatabase } from '@/server/services/health.service';

const HTTP_SERVICE_UNAVAILABLE = 503;

/** Uptime check: reports degraded (503) when the database cannot be reached. */
export async function GET() {
  const timestamp = new Date().toISOString();
  try {
    await checkDatabase();
    return NextResponse.json({ data: { status: 'ok', timestamp } });
  } catch (error) {
    logger.error({ err: error }, 'Health check failed');
    return NextResponse.json(
      { data: { status: 'degraded', timestamp } },
      { status: HTTP_SERVICE_UNAVAILABLE },
    );
  }
}
