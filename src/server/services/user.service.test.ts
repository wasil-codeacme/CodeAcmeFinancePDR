import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Role, UserStatus } from '@/generated/prisma/enums';
import { MESSAGES } from '@/lib/messages';

const mocks = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  countActiveFounders: vi.fn(),
  record: vi.fn(),
  deleteAllForUser: vi.fn(),
  send: vi.fn(),
}));

vi.mock('@/server/repositories/user.repository', () => ({
  userRepository: {
    findByEmail: mocks.findByEmail,
    findById: mocks.findById,
    create: mocks.create,
    update: mocks.update,
    countActiveFounders: mocks.countActiveFounders,
  },
}));
vi.mock('@/server/repositories/audit.repository', () => ({
  auditRepository: { record: mocks.record },
}));
vi.mock('@/server/repositories/auth.repository', () => ({
  sessionRepository: { deleteAllForUser: mocks.deleteAllForUser },
}));
vi.mock('@/server/repositories/db', () => ({
  runInTransaction: (work: () => Promise<unknown>) => work(),
}));
vi.mock('@/server/container', () => ({ emailService: { send: mocks.send } }));

const { inviteUser, removeUser } = await import('@/server/services/user.service');

const ACTOR = { id: 'founder-1', email: 'a@example.test', name: 'A', role: Role.FOUNDER };
const INVITED = {
  id: 'user-2',
  email: 'new@example.test',
  name: 'New',
  role: Role.FINANCE_MANAGER,
  status: UserStatus.INVITED,
  lastLoginAt: null,
  createdAt: new Date(),
};

describe('inviteUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findByEmail.mockResolvedValue(null);
    mocks.create.mockResolvedValue(INVITED);
  });

  it('creates the user with an audit entry and sends the invite', async () => {
    const user = await inviteUser(ACTOR, {
      email: 'New@Example.test',
      name: 'New',
      role: Role.FINANCE_MANAGER,
    });
    expect(user).toEqual(INVITED);
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new@example.test' }),
    );
    expect(mocks.record).toHaveBeenCalledOnce();
    expect(mocks.send).toHaveBeenCalledOnce();
  });

  it('still succeeds when the invite email fails (side-effect isolation)', async () => {
    mocks.send.mockRejectedValue(new Error('provider down'));
    await expect(
      inviteUser(ACTOR, { email: 'new@example.test', name: 'New', role: Role.FINANCE_MANAGER }),
    ).resolves.toEqual(INVITED);
  });

  it('refuses an email that already has access', async () => {
    mocks.findByEmail.mockResolvedValue(INVITED);
    await expect(
      inviteUser(ACTOR, { email: INVITED.email, name: 'New', role: Role.FINANCE_MANAGER }),
    ).rejects.toThrow(MESSAGES.USER.ALREADY_EXISTS);
  });
});

describe('removeUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('will not let a founder remove themselves', async () => {
    await expect(removeUser(ACTOR, ACTOR.id)).rejects.toThrow(MESSAGES.USER.CANNOT_REMOVE_SELF);
  });

  it('keeps at least one founder', async () => {
    mocks.findById.mockResolvedValue({ ...INVITED, role: Role.FOUNDER });
    mocks.countActiveFounders.mockResolvedValue(1);
    await expect(removeUser(ACTOR, INVITED.id)).rejects.toThrow(MESSAGES.USER.LAST_FOUNDER);
  });

  it('removes the user and signs them out everywhere', async () => {
    mocks.findById.mockResolvedValue(INVITED);
    mocks.update.mockResolvedValue({ ...INVITED, status: UserStatus.REMOVED });
    await removeUser(ACTOR, INVITED.id);
    expect(mocks.update).toHaveBeenCalledWith(INVITED.id, { status: UserStatus.REMOVED });
    expect(mocks.deleteAllForUser).toHaveBeenCalledWith(INVITED.id);
  });
});
