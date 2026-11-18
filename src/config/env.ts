import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

import { EMAIL_PROVIDER } from '@/lib/constants';

const NEXT_BUILD_PHASE = 'phase-production-build';

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    // Set by Vercel's Prisma Postgres integration (pooled.db.prisma.io); the app prefers it
    // so serverless traffic goes through the pooler. Absent locally.
    DATABASE_URL_POOLED: z.url().optional(),
    // Per function instance; Prisma Postgres advises about 5 behind its pooler on serverless.
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).default(5),
    APP_URL: z.url(),
    EMAIL_PROVIDER: z.enum([EMAIL_PROVIDER.CONSOLE, EMAIL_PROVIDER.RESEND]),
    EMAIL_FROM: z.string().min(3),
    RESEND_API_KEY: z.string().min(1).optional(),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  },
  client: {},
  experimental__runtimeEnv: {},
  emptyStringAsUndefined: true,
  // Only for tooling that never touches the database or email (unit tests, lint).
  skipValidation: process.env.SKIP_ENV_VALIDATION === 'true',
});

const isRunningInProduction =
  env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== NEXT_BUILD_PHASE;

if (env.EMAIL_PROVIDER === EMAIL_PROVIDER.RESEND && !env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is required when EMAIL_PROVIDER is "resend".');
}

// The console adapter prints sign-in codes to stdout; that is only acceptable locally.
if (isRunningInProduction && env.EMAIL_PROVIDER === EMAIL_PROVIDER.CONSOLE) {
  throw new Error('EMAIL_PROVIDER "console" is not allowed in production.');
}

/** The app's connection: the integration's pooled URL when present, otherwise DATABASE_URL. */
export const databaseUrl = env.DATABASE_URL_POOLED ?? env.DATABASE_URL;
