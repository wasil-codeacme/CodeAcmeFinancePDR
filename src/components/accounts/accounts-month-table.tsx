'use client';

import { Pencil } from 'lucide-react';
import Link from 'next/link';

import { InlineTextCell } from '@/components/revenue/inline-cells';
import { EditAccountForm } from '@/components/settings/accounts-section';
import { FormDialog } from '@/components/shared/form-dialog';
import { IconButton } from '@/components/shared/icon-button';
import { EmptyState } from '@/components/shared/empty-state';
import { Money } from '@/components/shared/money';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useOptimisticList } from '@/hooks/use-optimistic-list';
import { Decimal } from '@/lib/decimal';
import { MESSAGES } from '@/lib/messages';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { saveClosingBalance } from '@/server/actions/account.actions';
import type { AccountRecord } from '@/server/repositories/settings.repository';
import type { AccountMonthRow } from '@/types/account';

// A closing balance can be negative (an overdrawn account).
const SIGNED_MONEY_PATTERN = /^-?\d+(\.\d{1,2})?$/;

function Difference({ row }: { row: AccountMonthRow }) {
  if (row.difference === null) {
    return <span className="text-muted-foreground text-xs">not entered</span>;
  }
  const isZero = new Decimal(row.difference).isZero();
  return (
    <Money
      value={row.difference}
      currency={row.currency}
      className={cn(!isZero && 'font-medium text-amber-600 dark:text-amber-400')}
    />
  );
}

function EditAccountButton({ account }: { account: AccountRecord | undefined }) {
  if (!account) return null;
  return (
    <FormDialog
      title={`Edit ${account.name}`}
      description="Name, type, owner, currency, opening balance, or deactivate it."
      trigger={
        <IconButton size="icon-sm" variant="ghost" label={`Edit ${account.name}`}>
          <Pencil />
        </IconButton>
      }
    >
      {(close) => <EditAccountForm account={account} onDone={close} />}
    </FormDialog>
  );
}

type AccountsMonthTableProps = {
  rows: AccountMonthRow[];
  readOnly: boolean;
  /** Present when the user may manage accounts (founders): enables editing each one. */
  editableAccounts?: AccountRecord[];
};

/**
 * PRD §5.4: type only the closing figure; the opening is last month's closing. Expected =
 * opening + money in − money out, and the difference flags anything unexplained.
 */
export function AccountsMonthTable({ rows, readOnly, editableAccounts }: AccountsMonthTableProps) {
  const { rows: optimisticRows, mutate } = useOptimisticList(
    rows.map((row) => ({ ...row, id: row.accountId })),
  );
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No accounts open in this month"
        description="Add accounts and their opening balances in Settings → Accounts."
      />
    );
  }
  // The typed closing shows at once with its difference (entered − expected, as on the server).
  const save = (row: AccountMonthRow, closingBalance: string) =>
    mutate(
      {
        type: 'update',
        id: row.accountId,
        patch: {
          enteredClosing: closingBalance,
          closing: closingBalance,
          difference: new Decimal(closingBalance).minus(row.expectedClosing).toString(),
        },
      },
      () => saveClosingBalance({ accountId: row.accountId, month: row.month, closingBalance }),
      MESSAGES.ACCOUNT.CLOSING_SAVED,
    );
  return (
    <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account</TableHead>
            <TableHead className="hidden text-right md:table-cell">Opening</TableHead>
            <TableHead className="hidden text-right lg:table-cell">In</TableHead>
            <TableHead className="hidden text-right lg:table-cell">Out</TableHead>
            <TableHead className="hidden text-right sm:table-cell">Expected</TableHead>
            <TableHead className="text-right">Closing</TableHead>
            <TableHead className="text-right">Difference</TableHead>
            {editableAccounts ? <TableHead className="sr-only">Edit</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {optimisticRows.map((row) => (
            <TableRow key={row.accountId}>
              <TableCell className="w-full max-w-0">
                <Link
                  href={ROUTES.ACCOUNT_DETAIL(row.accountId)}
                  className="block truncate font-medium hover:underline"
                >
                  {row.name}
                </Link>
                <div className="text-muted-foreground truncate text-xs">
                  {[row.ownerLabel, row.currency].filter(Boolean).join(' · ')}
                </div>
              </TableCell>
              <TableCell className="hidden text-right md:table-cell">
                <Money value={row.opening} currency={row.currency} />
              </TableCell>
              <TableCell className="hidden text-right lg:table-cell">
                <Money value={row.moneyIn} currency={row.currency} />
              </TableCell>
              <TableCell className="hidden text-right lg:table-cell">
                <Money value={row.moneyOut} currency={row.currency} />
              </TableCell>
              <TableCell className="hidden text-right sm:table-cell">
                <Money value={row.expectedClosing} currency={row.currency} />
              </TableCell>
              <TableCell className="text-right">
                <InlineTextCell
                  numeric
                  label={`${row.name} closing balance`}
                  value={row.enteredClosing ?? ''}
                  pattern={SIGNED_MONEY_PATTERN}
                  disabled={readOnly}
                  className="ml-auto w-24 min-w-0 sm:w-28"
                  onCommit={(value) => save(row, value)}
                />
              </TableCell>
              <TableCell className="text-right">
                <Difference row={row} />
              </TableCell>
              {editableAccounts ? (
                <TableCell className="w-10">
                  <EditAccountButton
                    account={editableAccounts.find((account) => account.id === row.accountId)}
                  />
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Inactive accounts are left out of the month; list them so they can be edited or reactivated. */
export function InactiveAccounts({ accounts }: { accounts: AccountRecord[] }) {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span>Inactive:</span>
      {accounts.map((account) => (
        <span key={account.id} className="inline-flex items-center">
          {account.name}
          <EditAccountButton account={account} />
        </span>
      ))}
    </div>
  );
}
