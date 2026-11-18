import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { Role } from '@/generated/prisma/enums';
import { PERMISSION } from '@/lib/permissions';
import { CACHE_TAG } from '@/server/cache-tags';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  updateTag: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock('next/cache', () => ({ updateTag: mocks.updateTag, refresh: mocks.refresh }));
vi.mock('@/server/auth/current-user', () => ({ getCurrentUser: mocks.getCurrentUser }));

const FOUNDER = { id: 'u', email: 'f@example.test', name: 'Founder', role: Role.FOUNDER };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentUser.mockResolvedValue(FOUNDER);
});

describe('writeAction keeps cached figures fresh', () => {
  it('invalidates the books cache after every successful write', async () => {
    const { writeAction } = await import('@/server/actions/action');
    const action = writeAction({
      schema: z.object({}),
      permission: PERMISSION.ENTRIES_WRITE,
      handler: async () => 'saved',
    });
    await expect(action({})).resolves.toEqual({ data: 'saved' });
    expect(mocks.updateTag).toHaveBeenCalledWith(CACHE_TAG.BOOKS);
  });

  it('also invalidates any extra tags the action names', async () => {
    const { writeAction } = await import('@/server/actions/action');
    const action = writeAction({
      schema: z.object({}),
      permission: PERMISSION.SETTINGS_MANAGE,
      invalidates: [CACHE_TAG.SETTINGS],
      handler: async () => true,
    });
    await action({});
    expect(mocks.updateTag).toHaveBeenCalledWith(CACHE_TAG.BOOKS);
    expect(mocks.updateTag).toHaveBeenCalledWith(CACHE_TAG.SETTINGS);
  });

  it('leaves the cache alone when the write fails', async () => {
    const { writeAction } = await import('@/server/actions/action');
    const action = writeAction({
      schema: z.object({}),
      permission: PERMISSION.ENTRIES_WRITE,
      handler: async () => {
        throw new Error('database down');
      },
    });
    await action({});
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });
});
