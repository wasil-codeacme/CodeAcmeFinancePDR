import 'dotenv/config';

import { defineConfig, env } from 'prisma/config';

// Prisma CLI config runs outside the app, so it reads the CLI-only env directly;
// the app itself reads env only through src/config/env.ts. Migrations need a direct
// connection: a pooled DATABASE_URL (PgBouncer, Neon/Supabase poolers) cannot run them,
// so DIRECT_DATABASE_URL wins when set.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: process.env.DIRECT_DATABASE_URL || env('DATABASE_URL'),
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
