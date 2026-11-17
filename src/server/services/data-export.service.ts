import { toIsoDate } from '@/lib/month';
import {
  ADJUSTMENT_KIND_LABEL,
  FUNDING_SOURCE_LABEL,
  INVOICE_STATUS_LABEL,
  PROJECT_STATUS_LABEL,
  SALES_CHANNEL_LABEL,
} from '@/lib/labels';
import { PERMISSION, hasPermission } from '@/lib/permissions';
import { EXPORT_CONTENT_TYPE } from '@/lib/reports';
import { spreadsheetWriter } from '@/server/container';
import { figuresOf } from '@/server/domain/revenue-view';
import { ForbiddenError } from '@/server/errors';
import {
  SHEET_CELL_FORMAT,
  type SheetCell,
  type SheetData,
} from '@/server/ports/spreadsheet-writer.port';
import { accountBalanceRepository } from '@/server/repositories/account-balance.repository';
import { expenseRepository } from '@/server/repositories/expense.repository';
import { ledgerRepository } from '@/server/repositories/ledger.repository';
import { revenueRepository } from '@/server/repositories/revenue.repository';
import {
  accountRepository,
  exchangeRateRepository,
} from '@/server/repositories/settings.repository';
import type { SessionUser } from '@/types/auth';
import type { ExportFile } from '@/types/export';

type CellInput = string | number | null | { money: string } | { rate: string };

function cell(input: CellInput): SheetCell {
  if (input !== null && typeof input === 'object') {
    return 'money' in input
      ? { value: Number(input.money), format: SHEET_CELL_FORMAT.MONEY }
      : { value: Number(input.rate) };
  }
  return { value: input };
}

function sheet(name: string, headers: string[], rows: CellInput[][]): SheetData {
  return {
    name,
    rows: [
      headers.map((header) => ({ value: header, bold: true })),
      ...rows.map((row) => row.map(cell)),
    ],
  };
}

async function revenueSheets(): Promise<SheetData[]> {
  const entries = await revenueRepository.listConfirmed();
  const revenue = sheet(
    'Revenue',
    [
      'Month',
      'Kind',
      'Client',
      'Project',
      'Platform',
      'Gross',
      'Fee %',
      'Fee',
      'Net',
      'Received',
      'Escrow',
      'Written off',
      'Outstanding',
      'Project status',
      'Invoice status',
      'Closed by',
      'Referred by',
      'Notes',
    ],
    entries.map((entry) => {
      const figures = figuresOf(entry);
      return [
        entry.bookingMonth,
        entry.kind,
        entry.clientName,
        entry.projectName,
        entry.platformName,
        { money: figures.gross.toString() },
        { rate: entry.feePercent },
        { money: figures.fee.toString() },
        { money: figures.net.toString() },
        { money: figures.received.toString() },
        { money: figures.fundedEscrow.toString() },
        { money: figures.adjusted.toString() },
        { money: figures.outstanding.toString() },
        PROJECT_STATUS_LABEL[entry.projectStatus],
        INVOICE_STATUS_LABEL[entry.invoiceStatus],
        entry.closedByName,
        entry.referredBy,
        entry.notes,
      ];
    }),
  );
  const receipts = sheet(
    'Receipts',
    ['Date', 'Client', 'Amount', 'Into account', 'Escrow'],
    entries.flatMap((entry) =>
      entry.receipts.map((receipt) => [
        receipt.receivedOn,
        entry.clientName,
        { money: receipt.amount },
        receipt.accountName,
        receipt.isEscrow ? 'Yes' : 'No',
      ]),
    ),
  );
  const adjustments = sheet(
    'Write-offs',
    ['Date', 'Posts to month', 'Client', 'Kind', 'Amount', 'Reason'],
    entries.flatMap((entry) =>
      entry.adjustments.map((adjustment) => [
        adjustment.adjustedOn,
        adjustment.postingMonth,
        entry.clientName,
        ADJUSTMENT_KIND_LABEL[adjustment.kind],
        { money: adjustment.amount },
        adjustment.reason,
      ]),
    ),
  );
  return [revenue, receipts, adjustments];
}

async function expenseSheet(): Promise<SheetData> {
  const expenses = await expenseRepository.listAllConfirmed();
  return sheet(
    'Expenses',
    [
      'Date',
      'Month',
      'Paid on',
      'Category',
      'Item',
      'Amount',
      'Currency',
      'Funding',
      'Funded by',
      'Paid from',
      'Sales channel',
      'Notes',
    ],
    expenses.map((expense) => [
      expense.expenseDate,
      expense.month,
      expense.paidOn,
      expense.categoryName,
      expense.item,
      { money: expense.amount },
      expense.currency,
      FUNDING_SOURCE_LABEL[expense.fundingSource],
      expense.fundingPartnerName,
      expense.paidFromAccountName,
      expense.salesChannel ? SALES_CHANNEL_LABEL[expense.salesChannel] : null,
      expense.notes,
    ]),
  );
}

async function cashSheets(): Promise<SheetData[]> {
  const [accounts, balances, transfers, ledger, rates] = await Promise.all([
    accountRepository.list(),
    accountBalanceRepository.listBalances(),
    accountBalanceRepository.listTransfers(),
    ledgerRepository.list(),
    exchangeRateRepository.list(),
  ]);
  const accountName = new Map(accounts.map((account) => [account.id, account]));
  return [
    sheet(
      'Closing balances',
      ['Account', 'Currency', 'Month', 'Closing balance'],
      balances.map((balance) => [
        accountName.get(balance.accountId)?.name ?? balance.accountId,
        accountName.get(balance.accountId)?.currency ?? null,
        balance.month,
        { money: balance.closingBalance },
      ]),
    ),
    sheet(
      'Transfers',
      ['Date', 'From', 'To', 'Sent', 'Received', 'Fee', 'Note'],
      transfers.map((transfer) => [
        transfer.transferredOn,
        transfer.fromAccountName,
        transfer.toAccountName,
        { money: transfer.amount },
        { money: transfer.receivedAmount },
        { money: transfer.fee },
        transfer.note,
      ]),
    ),
    sheet(
      'Partner ledger',
      ['Date', 'Month', 'Partner', 'Type', 'Amount', 'Account', 'Note', 'Posted by month close'],
      ledger.map((entry) => [
        entry.occurredOn,
        entry.month,
        entry.partnerName,
        entry.type,
        { money: entry.amount },
        entry.accountName,
        entry.note,
        entry.periodId ? 'Yes' : 'No',
      ]),
    ),
    sheet(
      'Exchange rates',
      ['Month', 'Rate'],
      rates.map((rate) => [rate.month, { rate: rate.rate }]),
    ),
  ];
}

/**
 * PRD §7: founders can export all data at any time. It includes partner figures, so it is
 * founders only; deleted entries stay out (they remain in the audit log).
 */
export async function exportAllData(user: SessionUser, now: Date): Promise<ExportFile> {
  if (!hasPermission(user.role, PERMISSION.DATA_EXPORT)) throw new ForbiddenError();
  const [revenue, expenses, cash] = await Promise.all([
    revenueSheets(),
    expenseSheet(),
    cashSheets(),
  ]);
  return {
    filename: `codeacme-all-data-${toIsoDate(now)}.xlsx`,
    contentType: EXPORT_CONTENT_TYPE.XLSX,
    body: await spreadsheetWriter.write([...revenue, expenses, ...cash]),
  };
}
