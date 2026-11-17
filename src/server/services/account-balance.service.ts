import { AuditAction, EntryStatus, ExpenseKind, FundingSource } from '@/generated/prisma/enums';
import { AUDIT_ENTITY } from '@/lib/constants';
import { Decimal, sumDecimals } from '@/lib/decimal';
import { MESSAGES } from '@/lib/messages';
import { type MonthKey, compareMonthKeys, monthOfIsoDate } from '@/lib/month';
import { PERMISSION, hasPermission } from '@/lib/permissions';
import { type AccountMonth, computeAccountTimeline } from '@/server/domain/account-balances';
import {
  type AccountMovementMap,
  aggregateAccountMovements,
} from '@/server/domain/account-movements';
import { convertCurrency } from '@/server/domain/currency';
import { pickEffectiveVersion } from '@/server/domain/effective-version';
import {
  ForbiddenError,
  MissingExchangeRateError,
  NotFoundError,
  RuleViolationError,
} from '@/server/errors';
import { assertMonthsOpen, isMonthClosed } from '@/server/period-guard';
import { accountBalanceRepository } from '@/server/repositories/account-balance.repository';
import { auditedChange, auditedCreate } from '@/server/repositories/audited-write';
import { companyRepository } from '@/server/repositories/company.repository';
import { runInTransaction } from '@/server/repositories/db';
import { expenseRepository } from '@/server/repositories/expense.repository';
import { ledgerRepository } from '@/server/repositories/ledger.repository';
import {
  type AccountRecord,
  accountRepository,
  exchangeRateRepository,
} from '@/server/repositories/settings.repository';
import type { ClosingBalanceInput, TransferInput } from '@/server/validators/account.schema';
import type { AccountMonthRow, AccountsMonthView } from '@/types/account';
import type { SessionUser } from '@/types/auth';

type Currencies = { reporting: string; display: string };

async function requireCurrencies(): Promise<Currencies> {
  const company = await companyRepository.find();
  if (!company) throw new NotFoundError();
  return { reporting: company.reportingCurrency, display: company.displayCurrency };
}

/** Everything that moved cash, grouped per account and month in each account's currency. */
async function loadMovements(accounts: readonly AccountRecord[], currencies: Currencies) {
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

function timelineFor(
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

function toRow(
  account: AccountRecord,
  month: AccountMonth,
  movements: AccountMovementMap,
): AccountMonthRow {
  const moved = movements[account.id]?.[month.month];
  return {
    accountId: account.id,
    name: account.name,
    currency: account.currency,
    ownerLabel: account.ownerLabel,
    month: month.month,
    opening: month.opening.toString(),
    receiptsIn: moved?.receiptsIn ?? '0',
    fundingIn: moved?.fundingIn ?? '0',
    transfersIn: moved?.transfersIn ?? '0',
    expensesOut: moved?.expensesOut ?? '0',
    transfersOut: moved?.transfersOut ?? '0',
    withdrawalsOut: moved?.withdrawalsOut ?? '0',
    expectedClosing: month.expectedClosing.toString(),
    enteredClosing: month.enteredClosing?.toString() ?? null,
    closing: month.closing.toString(),
    difference: month.difference?.toString() ?? null,
  };
}

async function enteredClosingsByAccount(): Promise<Map<string, Record<MonthKey, string>>> {
  const byAccount = new Map<string, Record<MonthKey, string>>();
  for (const balance of await accountBalanceRepository.listBalances()) {
    const months = byAccount.get(balance.accountId) ?? {};
    months[balance.month] = balance.closingBalance;
    byAccount.set(balance.accountId, months);
  }
  return byAccount;
}

/** PRD §5.4: every account's opening, movements, expected and entered closing for one month. */
export async function getAccountsMonth(month: MonthKey): Promise<AccountsMonthView> {
  const [accounts, currencies, entered, closed] = await Promise.all([
    accountRepository.list(),
    requireCurrencies(),
    enteredClosingsByAccount(),
    isMonthClosed(month),
  ]);
  const { movements, missingRateMonths, transfers, rateVersions } = await loadMovements(
    accounts,
    currencies,
  );
  const rows = accounts
    .filter(
      (account) => account.active && compareMonthKeys(account.openingBalanceMonth, month) <= 0,
    )
    .flatMap((account) => {
      const last = timelineFor(account, month, movements, entered).at(-1);
      return last ? [toRow(account, last, movements)] : [];
    });
  const rate = pickEffectiveVersion(rateVersions, month)?.rate ?? null;
  let totalReporting: string | null = null;
  let totalDisplay: string | null = null;
  try {
    const inReporting = rows.map((row) =>
      convertCurrency(row.closing, row.currency, currencies.reporting, rate, currencies),
    );
    totalReporting = sumDecimals(inReporting).toString();
    totalDisplay = rate ? sumDecimals(inReporting).times(rate).toString() : null;
  } catch (error) {
    if (!(error instanceof MissingExchangeRateError)) throw error;
  }
  return {
    month,
    rows,
    totalReporting,
    totalDisplay,
    currencies,
    missingRateMonths: missingRateMonths.filter(
      (missingMonth) => compareMonthKeys(missingMonth, month) <= 0,
    ),
    transfers: transfers.filter((transfer) => transfer.month === month),
    isClosed: closed,
  };
}

/** One account's opening and closing for every month since it opened (PRD step 2 "done when"). */
export async function getAccountHistory(
  accountId: string,
  throughMonth: MonthKey,
): Promise<AccountMonthRow[]> {
  const [account, currencies, entered] = await Promise.all([
    accountRepository.findById(accountId),
    requireCurrencies(),
    enteredClosingsByAccount(),
  ]);
  if (!account) throw new NotFoundError();
  const { movements } = await loadMovements([account], currencies);
  return timelineFor(account, throughMonth, movements, entered)
    .map((month) => toRow(account, month, movements))
    .reverse();
}

export async function saveClosingBalance(
  actor: SessionUser,
  input: ClosingBalanceInput,
): Promise<void> {
  await assertMonthsOpen(input.month);
  if (!(await accountRepository.findById(input.accountId))) throw new NotFoundError();
  await auditedChange(actor.id, {
    action: AuditAction.UPDATE,
    entityType: AUDIT_ENTITY.ACCOUNT_BALANCE,
    entityId: `${input.accountId}:${input.month}`,
    loadBefore: () => accountBalanceRepository.findBalance(input.accountId, input.month),
    apply: () => accountBalanceRepository.upsertBalance({ ...input, enteredById: actor.id }),
  });
}

/**
 * Moving money between accounts is neither revenue nor expense (PRD §4). A fee becomes a
 * company expense linked to the transfer; it has no paid-from account because the transfer
 * itself already took the cash out.
 */
export async function createTransfer(actor: SessionUser, input: TransferInput): Promise<void> {
  await assertMonthsOpen(monthOfIsoDate(input.transferredOn));
  const [from, to] = await Promise.all([
    accountRepository.findById(input.fromAccountId),
    accountRepository.findById(input.toAccountId),
  ]);
  if (!from || !to) throw new NotFoundError();
  const fee = new Decimal(input.fee ?? 0);
  if (from.currency !== to.currency && !input.receivedAmount) {
    throw new RuleViolationError(MESSAGES.ACCOUNT.RECEIVED_AMOUNT_REQUIRED);
  }
  const receivedAmount = input.receivedAmount ?? new Decimal(input.amount).minus(fee).toString();
  await runInTransaction(async () => {
    const transfer = await auditedCreate(actor.id, AUDIT_ENTITY.TRANSFER, () =>
      accountBalanceRepository.createTransfer({
        fromAccountId: from.id,
        toAccountId: to.id,
        transferredOn: input.transferredOn,
        amount: input.amount,
        receivedAmount,
        fee: fee.toString(),
        note: input.note,
        createdById: actor.id,
      }),
    );
    if (fee.isZero() || !input.feeCategoryId) return;
    const feeCategoryId = input.feeCategoryId;
    await auditedCreate(actor.id, AUDIT_ENTITY.EXPENSE, () =>
      expenseRepository.create(
        {
          kind: ExpenseKind.TRANSFER_FEE,
          transferId: transfer.id,
          status: EntryStatus.CONFIRMED,
          expenseDate: input.transferredOn,
          paidOn: null,
          categoryId: feeCategoryId,
          item: `Transfer fee: ${from.name} → ${to.name}`,
          payeeTeamMemberId: null,
          amount: fee.toString(),
          currency: from.currency,
          fundingSource: FundingSource.COMPANY,
          fundingPartnerId: null,
          paidFromAccountId: null,
          recurringTemplateId: null,
          notes: null,
        },
        actor.id,
      ),
    );
  });
}

export async function deleteTransfer(actor: SessionUser, id: string): Promise<void> {
  if (!hasPermission(actor.role, PERMISSION.ENTRIES_DELETE_CONFIRMED)) throw new ForbiddenError();
  const transfer = await accountBalanceRepository.findTransfer(id);
  if (!transfer) throw new NotFoundError();
  await assertMonthsOpen(transfer.month);
  await auditedChange(actor.id, {
    action: AuditAction.DELETE,
    entityType: AUDIT_ENTITY.TRANSFER,
    entityId: id,
    loadBefore: async () => transfer,
    apply: () => accountBalanceRepository.softDeleteTransfer(id),
  });
}
