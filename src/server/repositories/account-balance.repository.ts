import { EntryStatus } from '@/generated/prisma/enums';
import type { DecimalString } from '@/lib/decimal';
import { type MonthKey, isoDateToDate, monthOfIsoDate } from '@/lib/month';
import { db } from '@/server/repositories/db';
import { dateToIsoDate, dateToMonthKey, monthKeyToDbDate } from '@/server/repositories/mappers';

export type AccountBalanceRecord = {
  accountId: string;
  month: MonthKey;
  closingBalance: DecimalString;
};

export type TransferRecord = {
  id: string;
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  transferredOn: string;
  month: MonthKey;
  amount: DecimalString;
  receivedAmount: DecimalString;
  fee: DecimalString;
  note: string | null;
};

/** A cash movement through one account, in the currency it was recorded in. */
export type CashMovementRecord = {
  accountId: string;
  month: MonthKey;
  amount: DecimalString;
  currency: string | null;
};

const LIVE = { deletedAt: null } as const;
const TRANSFER_INCLUDE = {
  fromAccount: { select: { name: true } },
  toAccount: { select: { name: true } },
} as const;

function toTransfer(row: {
  id: string;
  fromAccountId: string;
  fromAccount: { name: string };
  toAccountId: string;
  toAccount: { name: string };
  transferredOn: Date;
  month: Date;
  amount: { toString(): string };
  receivedAmount: { toString(): string };
  fee: { toString(): string };
  note: string | null;
}): TransferRecord {
  return {
    id: row.id,
    fromAccountId: row.fromAccountId,
    fromAccountName: row.fromAccount.name,
    toAccountId: row.toAccountId,
    toAccountName: row.toAccount.name,
    transferredOn: dateToIsoDate(row.transferredOn),
    month: dateToMonthKey(row.month),
    amount: row.amount.toString(),
    receivedAmount: row.receivedAmount.toString(),
    fee: row.fee.toString(),
    note: row.note,
  };
}

export const accountBalanceRepository = {
  async listBalances(): Promise<AccountBalanceRecord[]> {
    const rows = await db().accountBalance.findMany({ orderBy: { month: 'asc' } });
    return rows.map((row) => ({
      accountId: row.accountId,
      month: dateToMonthKey(row.month),
      closingBalance: row.closingBalance.toString(),
    }));
  },

  async findBalance(accountId: string, month: MonthKey): Promise<AccountBalanceRecord | null> {
    const row = await db().accountBalance.findUnique({
      where: { accountId_month: { accountId, month: monthKeyToDbDate(month) } },
    });
    return row ? { accountId, month, closingBalance: row.closingBalance.toString() } : null;
  },

  async upsertBalance(data: {
    accountId: string;
    month: MonthKey;
    closingBalance: DecimalString;
    enteredById: string;
  }): Promise<AccountBalanceRecord & { id: string }> {
    const month = monthKeyToDbDate(data.month);
    const row = await db().accountBalance.upsert({
      where: { accountId_month: { accountId: data.accountId, month } },
      create: { ...data, month },
      update: { closingBalance: data.closingBalance, enteredById: data.enteredById },
    });
    return {
      id: row.id,
      accountId: row.accountId,
      month: data.month,
      closingBalance: row.closingBalance.toString(),
    };
  },

  async listTransfers(): Promise<TransferRecord[]> {
    const rows = await db().transfer.findMany({
      where: LIVE,
      include: TRANSFER_INCLUDE,
      orderBy: { transferredOn: 'asc' },
    });
    return rows.map(toTransfer);
  },

  async findTransfer(id: string): Promise<TransferRecord | null> {
    const row = await db().transfer.findFirst({
      where: { ...LIVE, id },
      include: TRANSFER_INCLUDE,
    });
    return row ? toTransfer(row) : null;
  },

  async createTransfer(data: {
    fromAccountId: string;
    toAccountId: string;
    transferredOn: string;
    amount: DecimalString;
    receivedAmount: DecimalString;
    fee: DecimalString;
    note: string | null;
    createdById: string;
  }): Promise<TransferRecord> {
    const row = await db().transfer.create({
      data: {
        ...data,
        transferredOn: isoDateToDate(data.transferredOn),
        month: monthKeyToDbDate(monthOfIsoDate(data.transferredOn)),
      },
      include: TRANSFER_INCLUDE,
    });
    return toTransfer(row);
  },

  async softDeleteTransfer(id: string): Promise<TransferRecord> {
    const row = await db().transfer.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: TRANSFER_INCLUDE,
    });
    await db().expense.updateMany({
      where: { transferId: id, ...LIVE },
      data: { deletedAt: new Date() },
    });
    return toTransfer(row);
  },

  /** Money received into accounts (escrow funding is not cash yet). */
  async receiptsIntoAccounts(): Promise<CashMovementRecord[]> {
    const rows = await db().receipt.findMany({
      where: { ...LIVE, isEscrow: false, accountId: { not: null }, revenueEntry: LIVE },
      select: { accountId: true, receivedOn: true, amount: true },
    });
    return rows.flatMap((row) =>
      row.accountId
        ? [
            {
              accountId: row.accountId,
              month: dateToMonthKey(row.receivedOn),
              amount: row.amount.toString(),
              currency: null,
            },
          ]
        : [],
    );
  },

  /** Confirmed expenses paid from an account, in the month the cash left (advances included). */
  async expensesPaidFromAccounts(): Promise<CashMovementRecord[]> {
    const rows = await db().expense.findMany({
      where: { ...LIVE, status: EntryStatus.CONFIRMED, paidFromAccountId: { not: null } },
      select: {
        paidFromAccountId: true,
        paidOn: true,
        expenseDate: true,
        amount: true,
        currency: true,
      },
    });
    return rows.flatMap((row) =>
      row.paidFromAccountId
        ? [
            {
              accountId: row.paidFromAccountId,
              month: dateToMonthKey(row.paidOn ?? row.expenseDate),
              amount: row.amount.toString(),
              currency: row.currency,
            },
          ]
        : [],
    );
  },
};
