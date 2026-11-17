import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { PendingSection } from '@/components/layout/pending-navigation';
import { ExpenseMonth } from '@/components/expenses/expense-month';
import {
  AddExpenseButton,
  GenerateDraftsButton,
  ManageCategoriesLink,
  ManageRecurringLink,
} from '@/components/expenses/expense-toolbar';
import { MonthPicker } from '@/components/shared/month-picker';
import { PageHeader } from '@/components/shared/page-header';
import { ControlsSkeleton, StatCardsSkeleton, TableSkeleton } from '@/components/shared/skeletons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SEARCH_PARAM } from '@/lib/constants';
import { MESSAGES } from '@/lib/messages';
import { dateInMonth, formatMonthLabel, monthFromSearchParam } from '@/lib/month';
import { PERMISSION, hasPermission } from '@/lib/permissions';
import { requireBooksUser } from '@/server/auth/current-user';
import { isSalesLine } from '@/server/domain/sales-cac';
import { getExpenseMonth } from '@/server/services/expense.service';
import { getProfitSharingSettings } from '@/server/services/profit-sharing.service';
import {
  listAccounts,
  listExpenseCategories,
  listTeamMembers,
} from '@/server/services/settings.service';

export const metadata: Metadata = { title: 'Expenses' };

const FIRST_DAY = 1;

async function ExpensesContent({ searchParams }: Pick<PageProps<'/expenses'>, 'searchParams'>) {
  const [user, params] = await Promise.all([
    requireBooksUser(PERMISSION.ENTRIES_WRITE),
    searchParams,
    connection(),
  ]);
  const month = monthFromSearchParam(params[SEARCH_PARAM.MONTH], new Date());
  const [view, categories, members, profitSharing, accounts] = await Promise.all([
    getExpenseMonth(month),
    listExpenseCategories(),
    listTeamMembers(),
    getProfitSharingSettings(),
    listAccounts(),
  ]);
  const options = {
    categories: categories
      .filter((category) => category.active)
      .map((category) => ({ value: category.id, label: category.name })),
    salesCategoryIds: categories
      .filter((category) => category.active && isSalesLine(category.pnlLine))
      .map((category) => category.id),
    teamMembers: members
      .filter((member) => member.active)
      .map((member) => ({ value: member.id, label: member.name })),
    partners: profitSharing.partners
      .filter((partner) => partner.active)
      .map((partner) => ({ value: partner.id, label: partner.name })),
    accounts: accounts
      .filter((account) => account.active)
      .map((account) => ({ value: account.id, label: account.name })),
    currencies: view.currencies,
    rate: view.rate?.value ?? null,
  };
  const canDeleteConfirmed = hasPermission(user.role, PERMISSION.ENTRIES_DELETE_CONFIRMED);
  const rateNote = view.rate
    ? `${view.rate.value} ${view.currencies.display}/${view.currencies.reporting}${view.rate.month === month ? '' : ` (carried from ${formatMonthLabel(view.rate.month)})`}`
    : null;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MonthPicker month={month} />
        <div className="flex flex-wrap gap-2">
          {hasPermission(user.role, PERMISSION.SETTINGS_MANAGE) ? <ManageCategoriesLink /> : null}
          <ManageRecurringLink />
          <GenerateDraftsButton month={month} />
          <AddExpenseButton defaultDate={dateInMonth(month, FIRST_DAY)} options={options} />
        </div>
      </div>
      {!view.rate ? (
        <Alert>
          <AlertDescription>{MESSAGES.PNL.RATE_MISSING}</AlertDescription>
        </Alert>
      ) : null}
      <PendingSection
        fallback={
          <div className="grid gap-5">
            <StatCardsSkeleton count={3} />
            <TableSkeleton />
          </div>
        }
      >
        <ExpenseMonth
          rows={view.rows}
          categories={view.categories}
          month={month}
          options={options}
          canDeleteConfirmed={canDeleteConfirmed}
          rateNote={rateNote}
        />
      </PendingSection>
    </div>
  );
}

export default function ExpensesPage({ searchParams }: PageProps<'/expenses'>) {
  return (
    <>
      <PageHeader
        eyebrow="Books"
        title="Expenses"
        description="Enter amounts in PKR or USD; the month's rate converts them. Partner-funded lines stay out of company profit."
      />
      <Suspense
        fallback={
          <div className="grid gap-5">
            <ControlsSkeleton />
            <StatCardsSkeleton count={3} />
            <TableSkeleton />
          </div>
        }
      >
        <ExpensesContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
