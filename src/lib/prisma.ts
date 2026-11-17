import { PrismaPg } from '@prisma/adapter-pg';

import { env } from '@/config/env';
import { PrismaClient } from '@/generated/prisma/client';

// Close idle connections before the database does, so a request never picks up a dead one.
const IDLE_CONNECTION_TIMEOUT_MS = 10_000;

// Dev hot-reload re-evaluates modules; reusing one client avoids exhausting connections.
const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: env.DATABASE_URL,
      max: env.DATABASE_POOL_MAX,
      idleTimeoutMillis: IDLE_CONNECTION_TIMEOUT_MS,
    }),
  });

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
