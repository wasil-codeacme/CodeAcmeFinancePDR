import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { AccountsMonthTable } from '@/components/accounts/accounts-month-table';
import { TransfersPanel } from '@/components/accounts/transfer-form';
import { PendingSection } from '@/components/layout/pending-navigation';
import { Money } from '@/components/shared/money';
import { MonthPicker } from '@/components/shared/month-picker';
import { PageHeader } from '@/components/shared/page-header';
import { ControlsSkeleton, StatCardsSkeleton, TableSkeleton } from '@/components/shared/skeletons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SEARCH_PARAM } from '@/lib/constants';
import { dateInMonth, formatMonthLabel, monthFromSearchParam } from '@/lib/month';
import { PERMISSION, hasPermission } from '@/lib/permissions';
import { requireBooksUser } from '@/server/auth/current-user';
import { getAccountsMonth } from '@/server/services/account-balance.service';
import { listExpenseCategories } from '@/server/services/settings.service';

export const metadata: Metadata = { title: 'Accounts' };

const FIRST_DAY = 1;

async function AccountsContent({ searchParams }: Pick<PageProps<'/accounts'>, 'searchParams'>) {
  const [user, params] = await Promise.all([
    requireBooksUser(PERMISSION.BALANCES_WRITE),
    searchParams,
    connection(),
  ]);
  const month = monthFromSearchParam(params[SEARCH_PARAM.MONTH], new Date());
  const [view, categories] = await Promise.all([getAccountsMonth(month), listExpenseCategories()]);
  const accountOptions = view.rows.map((row) => ({ value: row.accountId, label: row.name }));
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MonthPicker month={month} />
        {view.isClosed ? <Badge variant="secondary">Closed — read-only</Badge> : null}
      </div>
      {view.missingRateMonths.length > 0 ? (
        <Alert>
          <AlertDescription>
            Some movements could not be converted for want of an exchange rate:{' '}
            {view.missingRateMonths.map(formatMonthLabel).join(', ')}.
          </AlertDescription>
        </Alert>
      ) : null}
      <PendingSection fallback={<StatCardsSkeleton count={2} />}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card size="sm">
            <CardContent className="grid gap-1">
              <span className="text-muted-foreground text-xs">Company cash</span>
              <Money
                value={view.totalReporting}
                currency={view.currencies.reporting}
                className="text-base font-semibold"
              />
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="grid gap-1">
              <span className="text-muted-foreground text-xs">In {view.currencies.display}</span>
              <Money
                value={view.totalDisplay}
                currency={view.currencies.display}
                className="text-base font-semibold"
              />
            </CardContent>
          </Card>
        </div>
      </PendingSection>
      <PendingSection fallback={<TableSkeleton rows={3} />}>
        <AccountsMonthTable rows={view.rows} readOnly={view.isClosed} />
        <TransfersPanel
          transfers={view.transfers}
          readOnly={view.isClosed}
          canDelete={hasPermission(user.role, PERMISSION.ENTRIES_DELETE_CONFIRMED)}
          accounts={accountOptions}
          categories={categories
            .filter((category) => category.active)
            .map((category) => ({ value: category.id, label: category.name }))}
          defaultDate={dateInMonth(month, FIRST_DAY)}
        />
      </PendingSection>
    </div>
  );
}

export default function AccountsPage({ searchParams }: PageProps<'/accounts'>) {
  return (
    <>
      <PageHeader
        eyebrow="Month end"
        title="Accounts"
        description="Type each account's closing balance; the opening is always last month's closing. Expected = opening + money in − money out."
      />
      <Suspense
        fallback={
          <div className="grid gap-5">
            <ControlsSkeleton />
            <StatCardsSkeleton count={2} />
            <TableSkeleton rows={3} />
          </div>
        }
      >
        <AccountsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
