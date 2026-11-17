'use client';

import Link from 'next/link';

import { InlineTextCell } from '@/components/revenue/inline-cells';
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
import { useActionRunner } from '@/hooks/use-action-runner';
import { Decimal } from '@/lib/decimal';
import { MESSAGES } from '@/lib/messages';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { saveClosingBalance } from '@/server/actions/account.actions';
import type { AccountMonthRow } from '@/types/account';

// A closing balance can be negative (an overdrawn account).
const SIGNED_MONEY_PATTERN = /^-?\d+(\.\d{1,2})?$/;

function moneyIn(row: AccountMonthRow): string {
  return new Decimal(row.receiptsIn).plus(row.fundingIn).plus(row.transfersIn).toString();
}

function moneyOut(row: AccountMonthRow): string {
  return new Decimal(row.expensesOut).plus(row.transfersOut).plus(row.withdrawalsOut).toString();
}

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

type AccountsMonthTableProps = { rows: AccountMonthRow[]; readOnly: boolean };

/**
 * PRD §5.4: type only the closing figure; the opening is last month's closing. Expected =
 * opening + money in − money out, and the difference flags anything unexplained.
 */
export function AccountsMonthTable({ rows, readOnly }: AccountsMonthTableProps) {
  const { run, isPending } = useActionRunner();
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No accounts open in this month"
        description="Add accounts and their opening balances in Settings → Accounts."
      />
    );
  }
  const save = (row: AccountMonthRow, closingBalance: string) =>
    run(
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.accountId}>
              <TableCell className="max-w-48">
                <Link
                  href={ROUTES.ACCOUNT_DETAIL(row.accountId)}
                  prefetch
                  className="font-medium hover:underline"
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
                <Money value={moneyIn(row)} currency={row.currency} />
              </TableCell>
              <TableCell className="hidden text-right lg:table-cell">
                <Money value={moneyOut(row)} currency={row.currency} />
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
                  disabled={readOnly || isPending}
                  className="ml-auto w-28 min-w-0"
                  onCommit={(value) => save(row, value)}
                />
              </TableCell>
              <TableCell className="text-right">
                <Difference row={row} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
