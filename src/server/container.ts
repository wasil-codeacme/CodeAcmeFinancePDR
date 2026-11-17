import { env } from '@/config/env';
import { EMAIL_PROVIDER } from '@/lib/constants';
import { consoleEmailAdapter } from '@/server/adapters/console-email.adapter';
import { exceljsSpreadsheetReader } from '@/server/adapters/exceljs-spreadsheet-reader.adapter';
import { createResendEmailAdapter } from '@/server/adapters/resend-email.adapter';
import type { EmailService } from '@/server/ports/email-service.port';
import type { SpreadsheetReader } from '@/server/ports/spreadsheet-reader.port';

function selectEmailService(): EmailService {
  if (env.EMAIL_PROVIDER === EMAIL_PROVIDER.RESEND && env.RESEND_API_KEY) {
    return createResendEmailAdapter({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM });
  }
  return consoleEmailAdapter;
}

/** Composition root: the only place a provider is chosen for each port. */
export const emailService: EmailService = selectEmailService();

export const spreadsheetReader: SpreadsheetReader = exceljsSpreadsheetReader;
