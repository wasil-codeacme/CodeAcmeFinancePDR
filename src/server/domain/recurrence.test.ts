import { describe, expect, it } from 'vitest';

import { Frequency } from '@/generated/prisma/enums';
import { isTemplateDue } from '@/server/domain/recurrence';

const monthly = {
  frequency: Frequency.MONTHLY,
  startMonth: '2026-03',
  endMonth: null,
  active: true,
} as const;

describe('isTemplateDue', () => {
  it('is due every month from the start month', () => {
    expect(isTemplateDue(monthly, '2026-02')).toBe(false);
    expect(isTemplateDue(monthly, '2026-03')).toBe(true);
    expect(isTemplateDue(monthly, '2027-01')).toBe(true);
  });

  it('stops after the end month and when inactive', () => {
    expect(isTemplateDue({ ...monthly, endMonth: '2026-05' }, '2026-06')).toBe(false);
    expect(isTemplateDue({ ...monthly, active: false }, '2026-04')).toBe(false);
  });

  it('respects quarterly and yearly intervals', () => {
    const quarterly = { ...monthly, frequency: Frequency.QUARTERLY };
    expect(isTemplateDue(quarterly, '2026-06')).toBe(true);
    expect(isTemplateDue(quarterly, '2026-07')).toBe(false);
    const yearly = { ...monthly, frequency: Frequency.YEARLY };
    expect(isTemplateDue(yearly, '2027-03')).toBe(true);
    expect(isTemplateDue(yearly, '2026-09')).toBe(false);
  });
});
