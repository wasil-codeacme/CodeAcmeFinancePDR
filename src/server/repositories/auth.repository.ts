import { UserStatus } from '@/generated/prisma/enums';
import type { UserRecord } from '@/server/repositories/user.repository';
import { db } from '@/server/repositories/db';

export type LoginCodeRecord = {
  id: string;
  codeHash: string;
  attempts: number;
};

export const loginCodeRepository = {
  create(data: { userId: string; codeHash: string; expiresAt: Date }): Promise<{ id: string }> {
    return db().loginCode.create({ data, select: { id: true } });
  },

  countCreatedSince(userId: string, since: Date): Promise<number> {
    return db().loginCode.count({ where: { userId, createdAt: { gte: since } } });
  },

  /** The newest code still usable; requesting a new code implicitly supersedes older ones. */
  findLatestUsable(userId: string, now: Date): Promise<LoginCodeRecord | null> {
    return db().loginCode.findFirst({
      where: { userId, consumedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, codeHash: true, attempts: true },
    });
  },

  async incrementAttempts(id: string): Promise<void> {
    await db().loginCode.update({ where: { id }, data: { attempts: { increment: 1 } } });
  },

  async consumeAllForUser(userId: string, now: Date): Promise<void> {
    await db().loginCode.updateMany({
      where: { userId, consumedAt: null },
      data: { consumedAt: now },
    });
  },
};

export const sessionRepository = {
  async create(data: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    await db().session.create({ data });
  },

  async findActiveUserByTokenHash(tokenHash: string, now: Date): Promise<UserRecord | null> {
    const session = await db().session.findUnique({
      where: { tokenHash },
      select: {
        expiresAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
      },
    });
    if (!session || session.expiresAt <= now) return null;
    return session.user.status === UserStatus.ACTIVE ? session.user : null;
  },

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await db().session.deleteMany({ where: { tokenHash } });
  },

  async deleteAllForUser(userId: string): Promise<void> {
    await db().session.deleteMany({ where: { userId } });
  },
};
