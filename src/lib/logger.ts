import pino from 'pino';

import { env } from '@/config/env';

// Email addresses and one-time codes must never reach the logs (PII / credentials).
const REDACTED_PATHS = ['email', 'code', 'token', '*.email', '*.code', '*.token', 'to'];

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: { paths: REDACTED_PATHS, censor: '[redacted]' },
  base: { service: 'codeacme-finance' },
});
