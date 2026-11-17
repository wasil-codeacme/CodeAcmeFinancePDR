import { LedgerEntryType } from '@/generated/prisma/enums';
import { Decimal, type DecimalString } from '@/lib/decimal';
import type { MonthKey } from '@/lib/month';
import type { AccountMovements } from '@/server/domain/account-balances';
import { type CurrencyPair, convertCurrency } from '@/server/domain/currency';
import { MissingExchangeRateError } from '@/server/errors';

type MovementKind = keyof AccountMovements;

/** `currency: null` means the reporting currency (receipts and ledger entries are kept in it). */
type CashLine = {
  accountId: string;
  month: MonthKey;
  amount: DecimalString;
  currency: string | null;
};

type MovementSources = {
  accounts: readonly { id: string; currency: string }[];
  receipts: readonly CashLine[];
  expenses: readonly CashLine[];
  transfers: readonly {
    fromAccountId: string;
    toAccountId: string;
    month: MonthKey;
    amount: DecimalString;
    receivedAmount: DecimalString;
  }[];
  ledger: readonly {
    accountId: string | null;
    month: MonthKey;
    type: LedgerEntryType;
    amount: DecimalString;
  }[];
  currencies: CurrencyPair;
  rateFor: (month: MonthKey) => DecimalString | null;
};

export type AccountMovementMap = Record<string, Partial<Record<MonthKey, AccountMovements>>>;

const EMPTY: AccountMovements = {
  receiptsIn: '0',
  fundingIn: '0',
  transfersIn: '0',
  expensesOut: '0',
  transfersOut: '0',
  withdrawalsOut: '0',
};

/**
 * Turns everything that moved cash into per-account, per-month totals in each account's own
 * currency, ready for the expected-closing calculation. A month whose rate is missing is
 * reported rather than converted at a guess.
 */
export function aggregateAccountMovements(sources: MovementSources): {
  movements: AccountMovementMap;
  missingRateMonths: MonthKey[];
} {
  const currencyOf = new Map(sources.accounts.map((account) => [account.id, account.currency]));
  const movements: AccountMovementMap = {};
  const missing = new Set<MonthKey>();

  function add(
    accountId: string,
    month: MonthKey,
    kind: MovementKind,
    amount: DecimalString,
    currency: string | null,
  ) {
    const accountCurrency = currencyOf.get(accountId);
    if (!accountCurrency) return;
    let converted: Decimal;
    try {
      converted = convertCurrency(
        amount,
        currency ?? sources.currencies.reporting,
        accountCurrency,
        sources.rateFor(month),
        sources.currencies,
      );
    } catch (error) {
      if (error instanceof MissingExchangeRateError) {
        missing.add(month);
        return;
      }
      throw error;
    }
    const byMonth = (movements[accountId] ??= {});
    const current = byMonth[month] ?? EMPTY;
    byMonth[month] = { ...current, [kind]: new Decimal(current[kind]).plus(converted).toString() };
  }

  for (const receipt of sources.receipts) {
    add(receipt.accountId, receipt.month, 'receiptsIn', receipt.amount, receipt.currency);
  }
  for (const expense of sources.expenses) {
    add(expense.accountId, expense.month, 'expensesOut', expense.amount, expense.currency);
  }
  for (const transfer of sources.transfers) {
    const fromCurrency = currencyOf.get(transfer.fromAccountId) ?? null;
    const toCurrency = currencyOf.get(transfer.toAccountId) ?? null;
    add(transfer.fromAccountId, transfer.month, 'transfersOut', transfer.amount, fromCurrency);
    add(transfer.toAccountId, transfer.month, 'transfersIn', transfer.receivedAmount, toCurrency);
  }
  for (const entry of sources.ledger) {
    if (!entry.accountId) continue;
    if (entry.type === LedgerEntryType.WITHDRAWAL) {
      add(
        entry.accountId,
        entry.month,
        'withdrawalsOut',
        new Decimal(entry.amount).abs().toString(),
        null,
      );
    } else if (entry.type === LedgerEntryType.FUNDING_IN) {
      add(entry.accountId, entry.month, 'fundingIn', entry.amount, null);
    }
  }
  return { movements, missingRateMonths: [...missing].sort() };
}
