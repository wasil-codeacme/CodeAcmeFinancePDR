import type { NextRequest } from 'next/server';

import { logger } from '@/lib/logger';
import { getCurrentUser } from '@/server/auth/current-user';
import { DomainError, ForbiddenError, NotFoundError } from '@/server/errors';
import { getExpenseAttachmentFile } from '@/server/services/expense-attachment.service';

const HTTP = { UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, SERVER_ERROR: 500 } as const;

function plain(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

/**
 * Opens an expense attachment in the browser. Only PDFs and images verified from their
 * bytes are ever stored, and nosniff stops a browser from treating one as anything else.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteContext<'/expenses/attachments/[attachmentId]'>,
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return plain('Sign in to open attachments.', HTTP.UNAUTHORIZED);
  const { attachmentId } = await params;
  try {
    const file = await getExpenseAttachmentFile(user, attachmentId);
    return new Response(file.data, {
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `inline; filename="${file.fileName}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    if (error instanceof ForbiddenError) return plain('Not allowed.', HTTP.FORBIDDEN);
    if (error instanceof NotFoundError) return plain('Attachment not found.', HTTP.NOT_FOUND);
    if (error instanceof DomainError) return plain(error.userMessage, HTTP.NOT_FOUND);
    logger.error({ err: error, attachmentId, userId: user.id }, 'Attachment download failed');
    return plain('Could not open the attachment.', HTTP.SERVER_ERROR);
  }
}
