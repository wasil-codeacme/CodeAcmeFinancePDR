import { AuditAction, Role, UserStatus } from '@/generated/prisma/enums';
import { env } from '@/config/env';
import { AUDIT_ENTITY } from '@/lib/constants';
import { MESSAGES } from '@/lib/messages';
import { normalizeEmail } from '@/lib/normalize-email';
import { ROUTES } from '@/lib/routes';
import { runSideEffect } from '@/lib/side-effect';
import { emailService } from '@/server/container';
import { inviteEmail } from '@/server/email-templates/auth-emails';
import { ConflictError, NotFoundError, RuleViolationError } from '@/server/errors';
import { auditRepository } from '@/server/repositories/audit.repository';
import { sessionRepository } from '@/server/repositories/auth.repository';
import { runInTransaction } from '@/server/repositories/db';
import { type UserRecord, userRepository } from '@/server/repositories/user.repository';
import type { InviteUserInput } from '@/server/validators/user.schema';
import type { SessionUser } from '@/types/auth';

export function listUsers(): Promise<UserRecord[]> {
  return userRepository.list();
}

/** Invite-only access: the user exists before they ever sign in. */
export async function inviteUser(actor: SessionUser, input: InviteUserInput): Promise<UserRecord> {
  const email = normalizeEmail(input.email);
  const existing = await userRepository.findByEmail(email);
  if (existing && existing.status !== UserStatus.REMOVED) {
    throw new ConflictError(MESSAGES.USER.ALREADY_EXISTS);
  }
  const user = await runInTransaction(async () => {
    const invited = existing
      ? await userRepository.update(existing.id, {
          name: input.name,
          role: input.role,
          status: UserStatus.INVITED,
        })
      : await userRepository.create({
          email,
          name: input.name,
          role: input.role,
          status: UserStatus.INVITED,
          invitedById: actor.id,
        });
    await auditRepository.record({
      actorUserId: actor.id,
      action: existing ? AuditAction.UPDATE : AuditAction.CREATE,
      entityType: AUDIT_ENTITY.USER,
      entityId: invited.id,
      before: existing,
      after: invited,
    });
    return invited;
  });
  const loginUrl = new URL(ROUTES.AUTH.LOGIN, env.APP_URL).toString();
  await runSideEffect(() => emailService.send(inviteEmail(user.email, actor.name, loginUrl)), {
    effect: 'invite-email',
    userId: user.id,
  });
  return user;
}

async function assertFounderRemains(userId: string, nextRole: Role | null): Promise<void> {
  const user = await userRepository.findById(userId);
  if (!user) throw new NotFoundError();
  const losesFounder = user.role === Role.FOUNDER && nextRole !== Role.FOUNDER;
  if (losesFounder && (await userRepository.countActiveFounders(Role.FOUNDER)) <= 1) {
    throw new RuleViolationError(MESSAGES.USER.LAST_FOUNDER);
  }
}

export async function changeUserRole(
  actor: SessionUser,
  userId: string,
  role: Role,
): Promise<UserRecord> {
  await assertFounderRemains(userId, role);
  return runInTransaction(async () => {
    const before = await userRepository.findById(userId);
    const updated = await userRepository.update(userId, { role });
    await auditRepository.record({
      actorUserId: actor.id,
      action: AuditAction.UPDATE,
      entityType: AUDIT_ENTITY.USER,
      entityId: userId,
      before,
      after: updated,
    });
    return updated;
  });
}

export async function removeUser(actor: SessionUser, userId: string): Promise<void> {
  if (actor.id === userId) throw new RuleViolationError(MESSAGES.USER.CANNOT_REMOVE_SELF);
  await assertFounderRemains(userId, null);
  await runInTransaction(async () => {
    const before = await userRepository.findById(userId);
    const updated = await userRepository.update(userId, { status: UserStatus.REMOVED });
    await sessionRepository.deleteAllForUser(userId);
    await auditRepository.record({
      actorUserId: actor.id,
      action: AuditAction.DELETE,
      entityType: AUDIT_ENTITY.USER,
      entityId: userId,
      before,
      after: updated,
    });
  });
}

/** First-run only: creates the founder who will invite everyone else. */
export async function bootstrapFirstFounder(input: {
  email: string;
  name: string;
}): Promise<UserRecord> {
  if ((await userRepository.count()) > 0) {
    throw new RuleViolationError('Users already exist; invite new users from Settings → Users.');
  }
  const founder = await userRepository.create({
    email: normalizeEmail(input.email),
    name: input.name,
    role: Role.FOUNDER,
    status: UserStatus.INVITED,
    invitedById: null,
  });
  await auditRepository.record({
    actorUserId: null,
    action: AuditAction.CREATE,
    entityType: AUDIT_ENTITY.USER,
    entityId: founder.id,
    after: founder,
  });
  return founder;
}
