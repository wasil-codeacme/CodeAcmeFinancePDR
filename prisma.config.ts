import 'dotenv/config';

import { defineConfig, env } from 'prisma/config';

// Prisma CLI config runs outside the app, so it reads the CLI-only env directly;
// the app itself reads env only through src/config/env.ts. Migrations need a direct
// connection, never the pooler: DIRECT_DATABASE_URL if set, else POSTGRES_URL (the direct
// URL Vercel's Prisma Postgres integration provides), else DATABASE_URL (local).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: process.env.DIRECT_DATABASE_URL || process.env.POSTGRES_URL || env('DATABASE_URL'),
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
