import { UserStatus } from '@/generated/prisma/enums';
import {
  LOGIN_CODE_MAX_ATTEMPTS,
  LOGIN_CODE_REQUEST_LIMIT,
  LOGIN_CODE_REQUEST_WINDOW_MINUTES,
  LOGIN_CODE_TTL_MINUTES,
  MS_PER_DAY,
  MS_PER_MINUTE,
  SESSION_TTL_DAYS,
} from '@/lib/constants';
import {
  generateLoginCode,
  generateSessionToken,
  hashLoginCode,
  hashesMatch,
  sha256Hex,
} from '@/lib/crypto';
import { logger } from '@/lib/logger';
import { MESSAGES } from '@/lib/messages';
import { normalizeEmail } from '@/lib/normalize-email';
import { emailService } from '@/server/container';
import { loginCodeEmail } from '@/server/email-templates/auth-emails';
import { RuleViolationError } from '@/server/errors';
import { loginCodeRepository, sessionRepository } from '@/server/repositories/auth.repository';
import { runInTransaction } from '@/server/repositories/db';
import { userRepository } from '@/server/repositories/user.repository';
import type { IssuedSession, SessionUser } from '@/types/auth';

/**
 * Sends a one-time code to an invited or active user. Unknown emails get the same silent
 * success so the form cannot be used to discover who has access. The email is essential
 * to logging in, so a send failure is surfaced rather than isolated as a side effect.
 */
export async function requestLoginCode(rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail);
  const user = await userRepository.findByEmail(email);
  if (!user || user.status === UserStatus.REMOVED) {
    logger.info('Login code requested for an email without access');
    return;
  }
  const now = Date.now();
  const windowStart = new Date(now - LOGIN_CODE_REQUEST_WINDOW_MINUTES * MS_PER_MINUTE);
  if (
    (await loginCodeRepository.countCreatedSince(user.id, windowStart)) >= LOGIN_CODE_REQUEST_LIMIT
  ) {
    throw new RuleViolationError(MESSAGES.AUTH.TOO_MANY_REQUESTS);
  }
  const code = generateLoginCode();
  await loginCodeRepository.create({
    userId: user.id,
    codeHash: hashLoginCode(user.id, code),
    expiresAt: new Date(now + LOGIN_CODE_TTL_MINUTES * MS_PER_MINUTE),
  });
  try {
    await emailService.send(loginCodeEmail(user.email, code));
  } catch (error) {
    logger.error({ err: error, userId: user.id }, 'Login code email failed');
    throw new RuleViolationError(MESSAGES.AUTH.EMAIL_FAILED);
  }
}

/** Exchanges a valid code for a new session; every failure looks the same to the caller. */
export async function verifyLoginCode(rawEmail: string, code: string): Promise<IssuedSession> {
  const invalid = new RuleViolationError(MESSAGES.AUTH.CODE_INVALID);
  const user = await userRepository.findByEmail(normalizeEmail(rawEmail));
  if (!user || user.status === UserStatus.REMOVED) throw invalid;
  const now = new Date();
  const loginCode = await loginCodeRepository.findLatestUsable(user.id, now);
  if (!loginCode || loginCode.attempts >= LOGIN_CODE_MAX_ATTEMPTS) throw invalid;
  if (!hashesMatch(hashLoginCode(user.id, code), loginCode.codeHash)) {
    await loginCodeRepository.incrementAttempts(loginCode.id);
    throw invalid;
  }
  const token = generateSessionToken();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_DAYS * MS_PER_DAY);
  await runInTransaction(async () => {
    await loginCodeRepository.consumeAllForUser(user.id, now);
    await sessionRepository.create({ userId: user.id, tokenHash: sha256Hex(token), expiresAt });
    await userRepository.update(user.id, { status: UserStatus.ACTIVE, lastLoginAt: now });
  });
  logger.info({ userId: user.id }, 'User signed in');
  return { token, expiresAt };
}

export async function findSessionUser(token: string): Promise<SessionUser | null> {
  const user = await sessionRepository.findActiveUserByTokenHash(sha256Hex(token), new Date());
  return user ? { id: user.id, email: user.email, name: user.name, role: user.role } : null;
}

export async function endSession(token: string): Promise<void> {
  await sessionRepository.deleteByTokenHash(sha256Hex(token));
}
