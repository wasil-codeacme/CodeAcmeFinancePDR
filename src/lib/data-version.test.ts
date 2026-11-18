import { describe, expect, it } from 'vitest';

import { hasNewData } from '@/lib/data-version';

describe('hasNewData (refresh only when someone changed something)', () => {
  it('never refreshes on the first reading, which only sets the baseline', () => {
    expect(hasNewData(null, '100')).toBe(false);
  });

  it('refreshes when the version moved on', () => {
    expect(hasNewData('100', '205')).toBe(true);
  });

  it('stays put while nothing changed', () => {
    expect(hasNewData('100', '100')).toBe(false);
  });
});
