import 'dotenv/config';

import { defineConfig, env } from 'prisma/config';

// Prisma CLI config runs outside the app, so it reads the CLI-only env directly;
// the app itself reads env only through src/config/env.ts.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: env('DATABASE_URL'),
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
