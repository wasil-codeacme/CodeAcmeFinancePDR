import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';

import {
  AddTemplateButton,
  RecurringTemplatesTable,
} from '@/components/expenses/recurring-templates';
import { PageHeader } from '@/components/shared/page-header';
import { TableSkeleton } from '@/components/shared/skeletons';
import { Skeleton } from '@/components/ui/skeleton';
import { currentMonthKey } from '@/lib/month';
import { PERMISSION } from '@/lib/permissions';
import { requireBooksUser } from '@/server/auth/current-user';
import { isSalesLine } from '@/server/domain/sales-cac';
import { getCompany } from '@/server/services/company.service';
import { getProfitSharingSettings } from '@/server/services/profit-sharing.service';
import { listRecurringTemplates } from '@/server/services/recurring-template.service';
import {
  listAccounts,
  listExpenseCategories,
  listTeamMembers,
} from '@/server/services/settings.service';

export const metadata: Metadata = { title: 'Recurring expenses' };

async function RecurringContent() {
  await Promise.all([requireBooksUser(PERMISSION.ENTRIES_WRITE), connection()]);
  const [templates, categories, members, profitSharing, accounts, company] = await Promise.all([
    listRecurringTemplates(),
    listExpenseCategories(),
    listTeamMembers(),
    getProfitSharingSettings(),
    listAccounts(),
    getCompany(),
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
    currencies: {
      reporting: company?.reportingCurrency ?? '',
      display: company?.displayCurrency ?? '',
    },
    rate: null,
  };
  const startMonth = currentMonthKey(new Date());
  return (
    <div className="grid gap-5">
      <div className="flex justify-end">
        <AddTemplateButton options={options} startMonth={startMonth} />
      </div>
      <RecurringTemplatesTable templates={templates} options={options} startMonth={startMonth} />
    </div>
  );
}

export default function RecurringExpensesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Books"
        title="Recurring expenses"
        description="Salaries and subscriptions. “Generate recurring” on the Expenses page drafts the ones due that month."
      />
      <Suspense
        fallback={
          <div className="grid gap-5">
            <Skeleton className="ml-auto h-8 w-36 rounded-lg" />
            <TableSkeleton />
          </div>
        }
      >
        <RecurringContent />
      </Suspense>
    </>
  );
}
