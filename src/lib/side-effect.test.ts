import { describe, expect, it, vi } from 'vitest';

import { runSideEffect } from '@/lib/side-effect';

describe('runSideEffect', () => {
  it('swallows a failing effect so the caller still succeeds', async () => {
    const failing = vi.fn().mockRejectedValue(new Error('provider down'));
    await expect(runSideEffect(failing, { effect: 'test' })).resolves.toBeUndefined();
    expect(failing).toHaveBeenCalledOnce();
  });

  it('runs a healthy effect', async () => {
    const effect = vi.fn().mockResolvedValue(undefined);
    await runSideEffect(effect, { effect: 'test' });
    expect(effect).toHaveBeenCalledOnce();
  });
});
