import { Decimal, ZERO, sumDecimals } from '@/lib/decimal';
import type { MonthKey } from '@/lib/month';
import type { AccountMonth, AccountMovements } from '@/server/domain/account-balances';

export type AccountCashInput = {
  accountId: string;
  name: string;
  currency: string;
  /** The account's balances for the month; undefined before the account opened. */
  balances: AccountMonth | undefined;
  movements: AccountMovements | undefined;
};

export type AccountClosing = { accountId: string; name: string; closing: Decimal };

/** Company cash for one month, all in the reporting currency (workbook Dashboard "Running Balance"). */
export type CashMonth = {
  month: MonthKey;
  received: Decimal;
  fundingIn: Decimal;
  paidOut: Decimal;
  withdrawals: Decimal;
  /** Transfer fees and currency differences: transfers between own accounts otherwise net to zero. */
  transfersNet: Decimal;
  accounts: AccountClosing[];
  /** Entered closing balances where typed, otherwise the expected figure. */
  companyCash: Decimal;
  expectedCash: Decimal;
  /** Entered − expected, over the accounts that have an entered closing; null if none do. */
  difference: Decimal | null;
};

export type ToReporting = (amount: Decimal.Value, currency: string) => Decimal | null;

type Converted = {
  input: AccountCashInput & { balances: AccountMonth };
  values: Record<keyof AccountMovements | 'closing' | 'expected' | 'difference', Decimal | null>;
};

function convertAccount(
  input: AccountCashInput & { balances: AccountMonth },
  toReporting: ToReporting,
): Converted | null {
  const moved = input.movements;
  const convert = (value: Decimal.Value | undefined) => toReporting(value ?? ZERO, input.currency);
  const values = {
    receiptsIn: convert(moved?.receiptsIn),
    fundingIn: convert(moved?.fundingIn),
    transfersIn: convert(moved?.transfersIn),
    expensesOut: convert(moved?.expensesOut),
    transfersOut: convert(moved?.transfersOut),
    withdrawalsOut: convert(moved?.withdrawalsOut),
    closing: convert(input.balances.closing),
    expected: convert(input.balances.expectedClosing),
    difference: input.balances.difference ? convert(input.balances.difference) : null,
  };
  const { difference: _difference, ...required } = values;
  return Object.values(required).some((value) => value === null) ? null : { input, values };
}

/**
 * Sums every open account's month into company figures. Returns null when an account's
 * currency cannot be converted (no exchange rate), rather than a misleading partial total.
 */
export function summarizeCashMonth(
  month: MonthKey,
  accounts: readonly AccountCashInput[],
  toReporting: ToReporting,
): CashMonth | null {
  const open = accounts.flatMap((account) =>
    account.balances ? [{ ...account, balances: account.balances }] : [],
  );
  const converted = open.map((account) => convertAccount(account, toReporting));
  if (converted.some((account) => account === null)) return null;
  const rows = converted.flatMap((account) => (account ? [account] : []));
  const total = (key: keyof Converted['values']) =>
    sumDecimals(rows.map((row) => row.values[key] ?? ZERO));
  const differences = rows.flatMap((row) => (row.values.difference ? [row.values.difference] : []));
  return {
    month,
    received: total('receiptsIn'),
    fundingIn: total('fundingIn'),
    paidOut: total('expensesOut'),
    withdrawals: total('withdrawalsOut'),
    transfersNet: total('transfersIn').minus(total('transfersOut')),
    accounts: rows.map((row) => ({
      accountId: row.input.accountId,
      name: row.input.name,
      closing: row.values.closing ?? ZERO,
    })),
    companyCash: total('closing'),
    expectedCash: total('expected'),
    difference: differences.length > 0 ? sumDecimals(differences) : null,
  };
}

export function netCashFlow(month: CashMonth): Decimal {
  return month.received
    .plus(month.fundingIn)
    .minus(month.paidOut)
    .minus(month.withdrawals)
    .plus(month.transfersNet);
}
