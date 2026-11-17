import { Decimal } from '@/lib/decimal';
import { type MonthKey, compareMonthKeys } from '@/lib/month';
import { type AccountMonth, computeAccountTimeline } from '@/server/domain/account-balances';
import {
  type AccountMovementMap,
  aggregateAccountMovements,
} from '@/server/domain/account-movements';
import { type CashMonth, summarizeCashMonth } from '@/server/domain/cash-position';
import { convertCurrency } from '@/server/domain/currency';
import { pickEffectiveVersion } from '@/server/domain/effective-version';
import { MissingExchangeRateError, NotFoundError } from '@/server/errors';
import { accountBalanceRepository } from '@/server/repositories/account-balance.repository';
import { companyRepository } from '@/server/repositories/company.repository';
import { ledgerRepository } from '@/server/repositories/ledger.repository';
import {
  type AccountRecord,
  accountRepository,
  exchangeRateRepository,
} from '@/server/repositories/settings.repository';

/**
 * Each account's month-by-month balances, shared by the Accounts page and the cash reports:
 * opening = last month's closing, expected closing = opening + money in − money out.
 */
export type Currencies = { reporting: string; display: string };

export async function requireCurrencies(): Promise<Currencies> {
  const company = await companyRepository.find();
  if (!company) throw new NotFoundError();
  return { reporting: company.reportingCurrency, display: company.displayCurrency };
}

/** Everything that moved cash, grouped per account and month in each account's currency. */
export async function loadMovements(accounts: readonly AccountRecord[], currencies: Currencies) {
  const [receipts, expenses, transfers, ledger, rates] = await Promise.all([
    accountBalanceRepository.receiptsIntoAccounts(),
    accountBalanceRepository.expensesPaidFromAccounts(),
    accountBalanceRepository.listTransfers(),
    ledgerRepository.list(),
    exchangeRateRepository.list(),
  ]);
  const rateVersions = rates.map((rate) => ({ effectiveFrom: rate.month, rate: rate.rate }));
  const aggregated = aggregateAccountMovements({
    accounts,
    receipts,
    expenses,
    transfers,
    ledger,
    currencies,
    rateFor: (month) => pickEffectiveVersion(rateVersions, month)?.rate ?? null,
  });
  return { ...aggregated, transfers, rateVersions };
}

export function timelineFor(
  account: AccountRecord,
  throughMonth: MonthKey,
  movements: AccountMovementMap,
  enteredByAccount: Map<string, Record<MonthKey, string>>,
): AccountMonth[] {
  return computeAccountTimeline({
    openingBalance: account.openingBalance,
    openingMonth: account.openingBalanceMonth,
    throughMonth,
    movements: movements[account.id] ?? {},
    enteredClosings: enteredByAccount.get(account.id) ?? {},
  });
}

export async function enteredClosingsByAccount(): Promise<Map<string, Record<MonthKey, string>>> {
  const byAccount = new Map<string, Record<MonthKey, string>>();
  for (const balance of await accountBalanceRepository.listBalances()) {
    const months = byAccount.get(balance.accountId) ?? {};
    months[balance.month] = balance.closingBalance;
    byAccount.set(balance.accountId, months);
  }
  return byAccount;
}

/**
 * Company cash for each month (workbook Dashboard running balance), in the reporting
 * currency at that month's rate. A month is null when an account can't be converted.
 */
export async function loadCashMonths(months: readonly MonthKey[]): Promise<{
  cash: Map<MonthKey, CashMonth | null>;
  accounts: { accountId: string; name: string }[];
}> {
  const sorted = [...months].sort(compareMonthKeys);
  const last = sorted.at(-1);
  const [accounts, currencies, entered] = await Promise.all([
    accountRepository.list(),
    requireCurrencies(),
    enteredClosingsByAccount(),
  ]);
  if (!last) return { cash: new Map(), accounts: [] };
  const { movements, rateVersions } = await loadMovements(accounts, currencies);
  const timelines = new Map(
    accounts.map((account) => [
      account.id,
      new Map(
        timelineFor(account, last, movements, entered).map((balances) => [
          balances.month,
          balances,
        ]),
      ),
    ]),
  );
  const cash = new Map(
    sorted.map((month): [MonthKey, CashMonth | null] => {
      const rate = pickEffectiveVersion(rateVersions, month)?.rate ?? null;
      const toReporting = (amount: Decimal.Value, currency: string) => {
        try {
          return convertCurrency(
            new Decimal(amount).toString(),
            currency,
            currencies.reporting,
            rate,
            currencies,
          );
        } catch (error) {
          if (error instanceof MissingExchangeRateError) return null;
          throw error;
        }
      };
      const inputs = accounts.map((account) => ({
        accountId: account.id,
        name: account.name,
        currency: account.currency,
        balances: timelines.get(account.id)?.get(month),
        movements: movements[account.id]?.[month],
      }));
      return [month, summarizeCashMonth(month, inputs, toReporting)];
    }),
  );
  return {
    cash,
    accounts: accounts.map((account) => ({ accountId: account.id, name: account.name })),
  };
}
