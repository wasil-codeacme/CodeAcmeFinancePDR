import { describe, expect, it } from 'vitest';

import { type AccountMovements, computeAccountTimeline } from '@/server/domain/account-balances';

const NO_MOVEMENT: AccountMovements = {
  receiptsIn: '0',
  fundingIn: '0',
  transfersIn: '0',
  expensesOut: '0',
  transfersOut: '0',
  withdrawalsOut: '0',
};

function movement(overrides: Partial<AccountMovements>): AccountMovements {
  return { ...NO_MOVEMENT, ...overrides };
}

describe('computeAccountTimeline (PRD §5.4)', () => {
  it('opens the first month with the account opening balance', () => {
    const [january] = computeAccountTimeline({
      openingBalance: '1000',
      openingMonth: '2026-01',
      throughMonth: '2026-01',
      movements: {},
      enteredClosings: {},
    });
    expect(january?.opening.toNumber()).toBe(1000);
    expect(january?.expectedClosing.toNumber()).toBe(1000);
  });

  it('expects opening + receipts + funding + transfers in − expenses − transfers out − withdrawals', () => {
    const [january] = computeAccountTimeline({
      openingBalance: '1000',
      openingMonth: '2026-01',
      throughMonth: '2026-01',
      movements: {
        '2026-01': movement({
          receiptsIn: '500',
          fundingIn: '50',
          transfersIn: '200',
          expensesOut: '300',
          transfersOut: '100',
          withdrawalsOut: '250',
        }),
      },
      enteredClosings: {},
    });
    expect(january?.expectedClosing.toNumber()).toBe(1100);
  });

  it('opens each month with the previous entered closing, never a typed opening', () => {
    const [january, february] = computeAccountTimeline({
      openingBalance: '1000',
      openingMonth: '2026-01',
      throughMonth: '2026-02',
      movements: { '2026-02': movement({ receiptsIn: '100' }) },
      enteredClosings: { '2026-01': '940' },
    });
    expect(january?.enteredClosing?.toNumber()).toBe(940);
    expect(january?.difference?.toNumber()).toBe(-60);
    expect(february?.opening.toNumber()).toBe(940);
    expect(february?.expectedClosing.toNumber()).toBe(1040);
  });

  it('carries the expected closing forward when a month was not entered', () => {
    const [, february, march] = computeAccountTimeline({
      openingBalance: '0',
      openingMonth: '2026-01',
      throughMonth: '2026-03',
      movements: { '2026-01': movement({ receiptsIn: '300' }) },
      enteredClosings: {},
    });
    expect(february?.opening.toNumber()).toBe(300);
    expect(february?.enteredClosing).toBeNull();
    expect(february?.difference).toBeNull();
    expect(march?.opening.toNumber()).toBe(300);
  });

  it('has no months before the account opened', () => {
    const timeline = computeAccountTimeline({
      openingBalance: '0',
      openingMonth: '2026-05',
      throughMonth: '2026-04',
      movements: {},
      enteredClosings: {},
    });
    expect(timeline).toEqual([]);
  });
});
