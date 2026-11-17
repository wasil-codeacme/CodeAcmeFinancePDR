import 'server-only';

import { refresh, updateTag } from 'next/cache';
import { z } from 'zod';

import { logger } from '@/lib/logger';
import { MESSAGES } from '@/lib/messages';
import { type Permission, hasPermission } from '@/lib/permissions';
import { getCurrentUser } from '@/server/auth/current-user';
import type { CacheTag } from '@/server/cache-tags';
import { DomainError } from '@/server/errors';
import type { ActionResponse } from '@/types/action-response';
import type { SessionUser } from '@/types/auth';

const PRISMA_UNIQUE_VIOLATION = 'P2002';
const PRISMA_RECORD_NOT_FOUND = 'P2025';

function prismaErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) return null;
  return typeof error.code === 'string' ? error.code : null;
}

/** Turns any thrown value into a message that is safe to show; logs the unexpected ones. */
export function mapError(error: unknown): string {
  if (error instanceof DomainError) return error.userMessage;
  const code = prismaErrorCode(error);
  if (code === PRISMA_UNIQUE_VIOLATION) return MESSAGES.COMMON.DUPLICATE;
  if (code === PRISMA_RECORD_NOT_FOUND) return MESSAGES.COMMON.NOT_FOUND;
  logger.error({ err: error }, 'Server action failed');
  return MESSAGES.COMMON.UNEXPECTED_ERROR;
}

type WriteActionConfig<TSchema extends z.ZodType, TResult> = {
  schema: TSchema;
  permission: Permission;
  /** Cached reference data this write changes; those tags are expired immediately. */
  invalidates?: readonly CacheTag[];
  handler: (input: z.output<TSchema>, actor: SessionUser) => Promise<TResult>;
};

/**
 * Every mutating Server Action goes through here so none can skip authentication, the
 * permission check, validation, error mapping or cache invalidation. After a write,
 * `refresh()` re-renders the current page and clears the browser's page cache, so the
 * user sees their change; `updateTag` expires any cached reference data it touched.
 */
export function writeAction<TSchema extends z.ZodType, TResult>(
  config: WriteActionConfig<TSchema, TResult>,
): (input: z.input<TSchema>) => Promise<ActionResponse<TResult>> {
  return async (rawInput) => {
    const actor = await getCurrentUser();
    if (!actor) return { error: MESSAGES.COMMON.UNAUTHENTICATED };
    if (!hasPermission(actor.role, config.permission)) return { error: MESSAGES.COMMON.FORBIDDEN };
    const parsed = config.schema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: MESSAGES.COMMON.VALIDATION_ERROR,
        fieldErrors: z.flattenError(parsed.error).fieldErrors,
      };
    }
    try {
      const data = await config.handler(parsed.data, actor);
      for (const tag of config.invalidates ?? []) updateTag(tag);
      refresh();
      return { data };
    } catch (error) {
      return { error: mapError(error) };
    }
  };
}

type ReadActionConfig<TSchema extends z.ZodType, TResult> = Omit<
  WriteActionConfig<TSchema, TResult>,
  'invalidates'
>;

/** Same guards as `writeAction` for reads that need client input (e.g. an uploaded file); no cache refresh. */
export function readAction<TSchema extends z.ZodType, TResult>(
  config: ReadActionConfig<TSchema, TResult>,
): (input: z.input<TSchema>) => Promise<ActionResponse<TResult>> {
  return async (rawInput) => {
    const actor = await getCurrentUser();
    if (!actor) return { error: MESSAGES.COMMON.UNAUTHENTICATED };
    if (!hasPermission(actor.role, config.permission)) return { error: MESSAGES.COMMON.FORBIDDEN };
    const parsed = config.schema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: MESSAGES.COMMON.VALIDATION_ERROR,
        fieldErrors: z.flattenError(parsed.error).fieldErrors,
      };
    }
    try {
      return { data: await config.handler(parsed.data, actor) };
    } catch (error) {
      return { error: mapError(error) };
    }
  };
}
