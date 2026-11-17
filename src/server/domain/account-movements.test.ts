import { describe, expect, it } from 'vitest';

import { LedgerEntryType } from '@/generated/prisma/enums';
import { aggregateAccountMovements } from '@/server/domain/account-movements';

const CURRENCIES = { reporting: 'USD', display: 'PKR' };
const ACCOUNTS = [
  { id: 'wise', currency: 'USD' },
  { id: 'meezan', currency: 'PKR' },
];
const NO_SOURCES = { receipts: [], expenses: [], transfers: [], ledger: [] };

function aggregate(sources: Partial<Parameters<typeof aggregateAccountMovements>[0]>) {
  return aggregateAccountMovements({
    ...NO_SOURCES,
    accounts: ACCOUNTS,
    currencies: CURRENCIES,
    rateFor: () => '278',
    ...sources,
  });
}

describe('aggregateAccountMovements (PRD §5.4 expected closing inputs)', () => {
  it('adds receipts into the account they landed in', () => {
    const { movements } = aggregate({
      receipts: [{ accountId: 'wise', month: '2026-01', amount: '500', currency: null }],
    });
    expect(movements.wise?.['2026-01']?.receiptsIn).toBe('500');
  });

  it('converts a PKR expense paid from a USD account at the month rate', () => {
    const { movements } = aggregate({
      expenses: [{ accountId: 'wise', month: '2026-01', amount: '27800', currency: 'PKR' }],
    });
    expect(movements.wise?.['2026-01']?.expensesOut).toBe('100');
  });

  it('converts a USD receipt into a PKR account', () => {
    const { movements } = aggregate({
      receipts: [{ accountId: 'meezan', month: '2026-01', amount: '10', currency: null }],
    });
    expect(movements.meezan?.['2026-01']?.receiptsIn).toBe('2780');
  });

  it('moves a transfer out of one account and its received amount into the other', () => {
    const { movements } = aggregate({
      transfers: [
        {
          fromAccountId: 'wise',
          toAccountId: 'meezan',
          month: '2026-02',
          amount: '100',
          receivedAmount: '27500',
        },
      ],
    });
    expect(movements.wise?.['2026-02']?.transfersOut).toBe('100');
    expect(movements.meezan?.['2026-02']?.transfersIn).toBe('27500');
  });

  it('takes partner withdrawals out and funding in, ignoring entries with no account', () => {
    const { movements } = aggregate({
      ledger: [
        { accountId: 'wise', month: '2026-03', type: LedgerEntryType.WITHDRAWAL, amount: '-200' },
        { accountId: 'wise', month: '2026-03', type: LedgerEntryType.FUNDING_IN, amount: '50' },
        { accountId: null, month: '2026-03', type: LedgerEntryType.PROFIT_SHARE, amount: '900' },
      ],
    });
    expect(movements.wise?.['2026-03']?.withdrawalsOut).toBe('200');
    expect(movements.wise?.['2026-03']?.fundingIn).toBe('50');
  });

  it('flags months it could not convert instead of guessing', () => {
    const result = aggregate({
      rateFor: () => null,
      expenses: [{ accountId: 'wise', month: '2026-04', amount: '1000', currency: 'PKR' }],
    });
    expect(result.missingRateMonths).toEqual(['2026-04']);
    expect(result.movements.wise?.['2026-04']?.expensesOut ?? '0').toBe('0');
  });
});
