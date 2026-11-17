import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      // `server-only` throws outside the React server runtime; tests exercise server code directly.
      'server-only': path.resolve(import.meta.dirname, 'src/test/empty-module.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    env: {
      SKIP_ENV_VALIDATION: 'true',
      LOG_LEVEL: 'fatal',
      APP_URL: 'http://localhost:3000',
      EMAIL_PROVIDER: 'console',
      EMAIL_FROM: 'Test <test@example.test>',
      DATABASE_URL: 'postgres://postgres:postgres@localhost:1/unused',
    },
  },
});
