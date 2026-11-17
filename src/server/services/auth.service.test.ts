import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Role, UserStatus } from '@/generated/prisma/enums';
import { hashLoginCode } from '@/lib/crypto';
import { MESSAGES } from '@/lib/messages';

const mocks = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  updateUser: vi.fn(),
  countCreatedSince: vi.fn(),
  createCode: vi.fn(),
  findLatestUsable: vi.fn(),
  incrementAttempts: vi.fn(),
  consumeAllForUser: vi.fn(),
  createSession: vi.fn(),
  send: vi.fn(),
}));

vi.mock('@/server/repositories/user.repository', () => ({
  userRepository: { findByEmail: mocks.findByEmail, update: mocks.updateUser },
}));
vi.mock('@/server/repositories/auth.repository', () => ({
  loginCodeRepository: {
    countCreatedSince: mocks.countCreatedSince,
    create: mocks.createCode,
    findLatestUsable: mocks.findLatestUsable,
    incrementAttempts: mocks.incrementAttempts,
    consumeAllForUser: mocks.consumeAllForUser,
  },
  sessionRepository: { create: mocks.createSession },
}));
vi.mock('@/server/repositories/db', () => ({
  runInTransaction: (work: () => Promise<unknown>) => work(),
}));
vi.mock('@/server/container', () => ({ emailService: { send: mocks.send } }));

const { requestLoginCode, verifyLoginCode } = await import('@/server/services/auth.service');

const USER = {
  id: 'user-1',
  email: 'founder@example.test',
  name: 'Founder',
  role: Role.FOUNDER,
  status: UserStatus.INVITED,
  lastLoginAt: null,
  createdAt: new Date(),
};

describe('requestLoginCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.countCreatedSince.mockResolvedValue(0);
  });

  it('emails a code to an invited user, matching the email case-insensitively', async () => {
    mocks.findByEmail.mockResolvedValue(USER);
    await requestLoginCode('  Founder@Example.test ');
    expect(mocks.findByEmail).toHaveBeenCalledWith('founder@example.test');
    expect(mocks.createCode).toHaveBeenCalledOnce();
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ to: USER.email }));
  });

  it('says nothing for an email without access (no account discovery)', async () => {
    mocks.findByEmail.mockResolvedValue(null);
    await expect(requestLoginCode('stranger@example.test')).resolves.toBeUndefined();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('throttles repeated requests', async () => {
    mocks.findByEmail.mockResolvedValue(USER);
    mocks.countCreatedSince.mockResolvedValue(5);
    await expect(requestLoginCode(USER.email)).rejects.toThrow(MESSAGES.AUTH.TOO_MANY_REQUESTS);
  });

  it('reports a failed send instead of hiding it, because login needs the email', async () => {
    mocks.findByEmail.mockResolvedValue(USER);
    mocks.send.mockRejectedValue(new Error('provider down'));
    await expect(requestLoginCode(USER.email)).rejects.toThrow(MESSAGES.AUTH.EMAIL_FAILED);
  });
});

describe('verifyLoginCode', () => {
  beforeEach(() => vi.clearAllMocks());

  it('issues a session for the right code and activates the invited user', async () => {
    mocks.findByEmail.mockResolvedValue(USER);
    mocks.findLatestUsable.mockResolvedValue({
      id: 'code-1',
      codeHash: hashLoginCode(USER.id, '123456'),
      attempts: 0,
    });
    const session = await verifyLoginCode(USER.email, '123456');
    expect(session.token.length).toBeGreaterThan(20);
    expect(mocks.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER.id,
        tokenHash: expect.not.stringContaining(session.token),
      }),
    );
    expect(mocks.updateUser).toHaveBeenCalledWith(
      USER.id,
      expect.objectContaining({ status: UserStatus.ACTIVE }),
    );
  });

  it('counts a wrong code as an attempt and rejects it', async () => {
    mocks.findByEmail.mockResolvedValue(USER);
    mocks.findLatestUsable.mockResolvedValue({
      id: 'code-1',
      codeHash: hashLoginCode(USER.id, '123456'),
      attempts: 0,
    });
    await expect(verifyLoginCode(USER.email, '000000')).rejects.toThrow(MESSAGES.AUTH.CODE_INVALID);
    expect(mocks.incrementAttempts).toHaveBeenCalledWith('code-1');
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it('rejects even the right code once attempts are used up', async () => {
    mocks.findByEmail.mockResolvedValue(USER);
    mocks.findLatestUsable.mockResolvedValue({
      id: 'code-1',
      codeHash: hashLoginCode(USER.id, '123456'),
      attempts: 5,
    });
    await expect(verifyLoginCode(USER.email, '123456')).rejects.toThrow(MESSAGES.AUTH.CODE_INVALID);
  });

  it('rejects a removed user', async () => {
    mocks.findByEmail.mockResolvedValue({ ...USER, status: UserStatus.REMOVED });
    await expect(verifyLoginCode(USER.email, '123456')).rejects.toThrow(MESSAGES.AUTH.CODE_INVALID);
  });
});
