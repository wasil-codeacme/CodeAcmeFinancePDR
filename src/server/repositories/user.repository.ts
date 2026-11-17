import { type Role, UserStatus } from '@/generated/prisma/enums';
import { db } from '@/server/repositories/db';

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
};

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

export const userRepository = {
  findByEmail(email: string): Promise<UserRecord | null> {
    return db().user.findUnique({ where: { email }, select: USER_SELECT });
  },

  findById(id: string): Promise<UserRecord | null> {
    return db().user.findUnique({ where: { id }, select: USER_SELECT });
  },

  list(): Promise<UserRecord[]> {
    return db().user.findMany({
      where: { status: { not: UserStatus.REMOVED } },
      select: USER_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  },

  count(): Promise<number> {
    return db().user.count();
  },

  countActiveFounders(founderRole: Role): Promise<number> {
    return db().user.count({ where: { role: founderRole, status: { not: UserStatus.REMOVED } } });
  },

  create(data: {
    email: string;
    name: string;
    role: Role;
    status: UserStatus;
    invitedById: string | null;
  }): Promise<UserRecord> {
    return db().user.create({ data, select: USER_SELECT });
  },

  update(
    id: string,
    data: Partial<{ name: string; role: Role; status: UserStatus; lastLoginAt: Date }>,
  ): Promise<UserRecord> {
    return db().user.update({ where: { id }, data, select: USER_SELECT });
  },
};
