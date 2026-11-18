import { PrismaPg } from '@prisma/adapter-pg';
import { attachDatabasePool } from '@vercel/functions';
import { Pool } from 'pg';

import { env } from '@/config/env';
import { PrismaClient } from '@/generated/prisma/client';

// Close idle connections well before the database or the pooler drops them, so a request
// never picks up a dead one (Vercel's guidance for Fluid compute is about 5 s).
const IDLE_CONNECTION_TIMEOUT_MS = 5_000;

// Dev hot-reload re-evaluates modules; reusing one client avoids exhausting connections.
const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: env.DATABASE_POOL_MAX,
    idleTimeoutMillis: IDLE_CONNECTION_TIMEOUT_MS,
  });
  // On Vercel, keeps the function instance alive just long enough to release idle
  // connections before it suspends; it does nothing elsewhere.
  attachDatabasePool(pool);
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
