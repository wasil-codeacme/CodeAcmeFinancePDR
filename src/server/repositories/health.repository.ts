import { db } from '@/server/repositories/db';

export const healthRepository = {
  async ping(): Promise<void> {
    await db().$queryRaw`SELECT 1`;
  },
};
