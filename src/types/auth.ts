import type { Role } from '@/generated/prisma/enums';

/** The narrow view of the signed-in user that pages, actions and services work with. */
export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export type IssuedSession = {
  token: string;
  expiresAt: Date;
};
