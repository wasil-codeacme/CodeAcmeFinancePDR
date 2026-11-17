import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { checkDatabase } from '@/server/services/health.service';

const HTTP_SERVICE_UNAVAILABLE = 503;

/**
 * Uptime check: reports degraded (503) when the database cannot be reached. Server-Timing
 * carries the database round trip, so function-to-database latency is visible from outside.
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  try {
    const started = performance.now();
    await checkDatabase();
    const databaseMs = (performance.now() - started).toFixed(1);
    return NextResponse.json(
      { data: { status: 'ok', timestamp } },
      { headers: { 'Server-Timing': `db;dur=${databaseMs}` } },
    );
  } catch (error) {
    logger.error({ err: error }, 'Health check failed');
    return NextResponse.json(
      { data: { status: 'degraded', timestamp } },
      { status: HTTP_SERVICE_UNAVAILABLE },
    );
  }
}
