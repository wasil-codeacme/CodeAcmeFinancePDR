import { describe, expect, it } from 'vitest';

import { Decimal } from '@/lib/decimal';
import type { AccountMonth } from '@/server/domain/account-balances';
import { netCashFlow, summarizeCashMonth } from '@/server/domain/cash-position';

const RATE = 280;
const toReporting = (amount: Decimal.Value, currency: string) =>
  currency === 'USD' ? new Decimal(amount) : new Decimal(amount).dividedBy(RATE);

function balances(values: Partial<Record<keyof AccountMonth, string | null>>): AccountMonth {
  return {
    month: '2026-03',
    opening: new Decimal(values.opening ?? 0),
    inflow: new Decimal(0),
    outflow: new Decimal(0),
    expectedClosing: new Decimal(values.expectedClosing ?? 0),
    enteredClosing: values.enteredClosing ? new Decimal(values.enteredClosing) : null,
    closing: new Decimal(values.closing ?? 0),
    difference: values.difference ? new Decimal(values.difference) : null,
  };
}

const movements = {
  receiptsIn: '0',
  fundingIn: '0',
  transfersIn: '0',
  expensesOut: '0',
  transfersOut: '0',
  withdrawalsOut: '0',
};

describe('summarizeCashMonth (company cash, PRD §6: sum of account closing balances)', () => {
  const wise = {
    accountId: 'wise',
    name: 'Wise',
    currency: 'USD',
    balances: balances({
      expectedClosing: '1000',
      closing: '990',
      enteredClosing: '990',
      difference: '-10',
    }),
    movements: { ...movements, receiptsIn: '1500', expensesOut: '300', transfersOut: '200' },
  };
  const bank = {
    accountId: 'bank',
    name: 'Bank',
    currency: 'PKR',
    balances: balances({ expectedClosing: '56000', closing: '56000' }),
    movements: { ...movements, transfersIn: '55440', withdrawalsOut: '28000' },
  };

  it('adds every account in the reporting currency at the month rate', () => {
    const month = summarizeCashMonth('2026-03', [wise, bank], toReporting);
    expect(month?.companyCash.toNumber()).toBe(990 + 200);
    expect(month?.expectedCash.toNumber()).toBe(1000 + 200);
    expect(month?.received.toNumber()).toBe(1500);
    expect(month?.withdrawals.toNumber()).toBe(100);
  });

  it('keeps transfers between own accounts out of the flows except fees and currency differences', () => {
    const month = summarizeCashMonth('2026-03', [wise, bank], toReporting);
    expect(month?.transfersNet.toFixed(2)).toBe('-2.00');
    expect(month && netCashFlow(month).toFixed(2)).toBe('1098.00');
  });

  it('reports the difference only for accounts with an entered closing', () => {
    expect(summarizeCashMonth('2026-03', [wise, bank], toReporting)?.difference?.toNumber()).toBe(
      -10,
    );
    expect(summarizeCashMonth('2026-03', [bank], toReporting)?.difference).toBeNull();
  });

  it('skips accounts not yet open, and gives up rather than guess without a rate', () => {
    const later = { ...bank, accountId: 'later', balances: undefined };
    expect(summarizeCashMonth('2026-03', [wise, later], toReporting)?.accounts).toHaveLength(1);
    expect(
      summarizeCashMonth('2026-03', [wise, bank], (amount, currency) =>
        currency === 'USD' ? new Decimal(amount) : null,
      ),
    ).toBeNull();
  });
});
