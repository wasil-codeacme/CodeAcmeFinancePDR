import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { Money } from '@/components/shared/money';
import { PageHeader } from '@/components/shared/page-header';
import { TableSkeleton } from '@/components/shared/skeletons';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { currentMonthKey, formatMonthLabel } from '@/lib/month';
import { PERMISSION } from '@/lib/permissions';
import { requireBooksUser } from '@/server/auth/current-user';
import { cachedAccountHistory } from '@/server/cached-reads';

export const metadata: Metadata = { title: 'Account history' };

/** PRD step 2 "done when": every account shows its opening and closing balance for every month. */
async function AccountHistory({ params }: Pick<PageProps<'/accounts/[accountId]'>, 'params'>) {
  const [, { accountId }] = await Promise.all([
    requireBooksUser(PERMISSION.BALANCES_WRITE),
    params,
    connection(),
  ]);
  const months = await cachedAccountHistory(accountId, currentMonthKey(new Date()));
  const first = months[0];
  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{first?.name ?? 'Account'}</h2>
        {first ? (
          <p className="text-muted-foreground text-sm">
            {[first.ownerLabel, first.currency].filter(Boolean).join(' · ')}
          </p>
        ) : null}
      </div>
      <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Opening</TableHead>
              <TableHead className="hidden text-right md:table-cell">Expected</TableHead>
              <TableHead className="text-right">Closing</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Difference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {months.map((month) => (
              <TableRow key={month.month}>
                <TableCell>{formatMonthLabel(month.month)}</TableCell>
                <TableCell className="text-right">
                  <Money value={month.opening} currency={month.currency} />
                </TableCell>
                <TableCell className="hidden text-right md:table-cell">
                  <Money value={month.expectedClosing} currency={month.currency} />
                </TableCell>
                <TableCell className="text-right">
                  <Money value={month.closing} currency={month.currency} />
                  {month.enteredClosing === null ? (
                    <span className="text-muted-foreground block text-xs">
                      expected, not entered
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="hidden text-right sm:table-cell">
                  <Money value={month.difference} currency={month.currency} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/** The header shows at once; the account's name and months stream in. */
export default function AccountHistoryPage({ params }: PageProps<'/accounts/[accountId]'>) {
  return (
    <>
      <PageHeader
        eyebrow="Accounts"
        title="Account history"
        description="Opening, expected and closing balance for every month since the account opened."
      />
      <Suspense
        fallback={
          <div className="grid gap-4">
            <Skeleton className="h-7 w-56" />
            <TableSkeleton />
          </div>
        }
      >
        <AccountHistory params={params} />
      </Suspense>
    </>
  );
}
