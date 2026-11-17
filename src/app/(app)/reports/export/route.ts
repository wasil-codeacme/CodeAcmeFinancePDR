import type { NextRequest } from 'next/server';

import { logger } from '@/lib/logger';
import { parseReportPeriod } from '@/lib/report-period';
import { ALL_DATA_EXPORT } from '@/lib/reports';
import { getCurrentUser } from '@/server/auth/current-user';
import { DomainError, ForbiddenError } from '@/server/errors';
import { exportAllData } from '@/server/services/data-export.service';
import { exportReport } from '@/server/services/report.service';
import { exportQuerySchema } from '@/server/validators/report.schema';

const HTTP = { BAD_REQUEST: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, SERVER_ERROR: 500 } as const;

function plain(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

/**
 * Downloads a report (XLSX or CSV) or, for founders, all data (XLSX). Thin controller:
 * authenticate, validate the query, delegate; the services check permissions.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return plain('Sign in to export.', HTTP.UNAUTHORIZED);
  const parsed = exportQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return plain('Unknown report or format.', HTTP.BAD_REQUEST);
  const query = parsed.data;
  const now = new Date();
  try {
    const file =
      query.report === ALL_DATA_EXPORT
        ? await exportAllData(user, now)
        : await exportReport(
            user,
            query.report,
            parseReportPeriod(query.period, now),
            now,
            query.format,
          );
    return new Response(file.body, {
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `attachment; filename="${file.filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return plain('Not allowed.', HTTP.FORBIDDEN);
    if (error instanceof DomainError) return plain(error.userMessage, HTTP.BAD_REQUEST);
    logger.error({ err: error, report: query.report, userId: user.id }, 'Export failed');
    return plain('The export failed. Try again.', HTTP.SERVER_ERROR);
  }
}
