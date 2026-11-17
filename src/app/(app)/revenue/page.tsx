import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { PendingSection } from '@/components/layout/pending-navigation';
import { AddRevenueForm } from '@/components/revenue/add-revenue-form';
import { CopyLastMonthButton } from '@/components/revenue/copy-last-month-button';
import { RevenueFilters } from '@/components/revenue/revenue-filters';
import { RevenueTable } from '@/components/revenue/revenue-table';
import { MonthPicker } from '@/components/shared/month-picker';
import { PageHeader } from '@/components/shared/page-header';
import { ReceivablesBreakdown } from '@/components/shared/receivables-breakdown';
import { ControlsSkeleton, StatCardsSkeleton, TableSkeleton } from '@/components/shared/skeletons';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectStatus } from '@/generated/prisma/enums';
import { SEARCH_PARAM } from '@/lib/constants';
import { monthFromSearchParam } from '@/lib/month';
import { PERMISSION, hasPermission } from '@/lib/permissions';
import { ROUTES } from '@/lib/routes';
import { requireBooksUser } from '@/server/auth/current-user';
import { listClients } from '@/server/services/client.service';
import { listPlatforms } from '@/server/services/platform.service';
import { getRevenueMonth } from '@/server/services/revenue.service';

export const metadata: Metadata = { title: 'Revenue' };

function stringParam(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function projectStatusParam(value: string | undefined): ProjectStatus | undefined {
  return Object.values(ProjectStatus).find((status) => status === value);
}

async function RevenueContent({ searchParams }: Pick<PageProps<'/revenue'>, 'searchParams'>) {
  const [user, params] = await Promise.all([
    requireBooksUser(PERMISSION.ENTRIES_WRITE),
    searchParams,
    connection(),
  ]);
  const month = monthFromSearchParam(params[SEARCH_PARAM.MONTH], new Date());
  const filters = {
    clientId: stringParam(params[SEARCH_PARAM.CLIENT]),
    platformId: stringParam(params[SEARCH_PARAM.PLATFORM]),
    projectStatus: projectStatusParam(stringParam(params[SEARCH_PARAM.STATUS])),
    search: stringParam(params[SEARCH_PARAM.QUERY]),
  };
  const [view, clients, platforms] = await Promise.all([
    getRevenueMonth(month, filters),
    listClients(),
    listPlatforms(),
  ]);
  const activeClients = clients.filter((client) => client.active);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MonthPicker month={month} />
        <CopyLastMonthButton month={month} />
      </div>
      {activeClients.length === 0 ? (
        <div className="bg-card flex flex-wrap items-center gap-3 rounded-xl border p-4 text-sm shadow-xs">
          Add a client first, then book revenue against it.
          <Button asChild size="sm" variant="outline">
            <Link href={ROUTES.CLIENTS} prefetch>
              Add a client
            </Link>
          </Button>
        </div>
      ) : (
        <AddRevenueForm
          key={month}
          month={month}
          clients={activeClients.map((client) => ({
            id: client.id,
            name: client.name,
            projects: client.projects
              .filter((project) => project.active)
              .map(({ id, name }) => ({ id, name })),
          }))}
        />
      )}
      <PendingSection fallback={<StatCardsSkeleton count={6} />}>
        <ReceivablesBreakdown totals={view.totals} />
      </PendingSection>
      <RevenueFilters
        clients={clients.map((client) => ({ value: client.id, label: client.name }))}
        platforms={platforms.map((platform) => ({ value: platform.id, label: platform.name }))}
      />
      <PendingSection fallback={<TableSkeleton />}>
        <RevenueTable
          entries={view.rows}
          canDeleteConfirmed={hasPermission(user.role, PERMISSION.ENTRIES_DELETE_CONFIRMED)}
        />
      </PendingSection>
    </div>
  );
}

export default function RevenuePage({ searchParams }: PageProps<'/revenue'>) {
  return (
    <>
      <PageHeader
        eyebrow="Books"
        title="Revenue"
        description="Work booked by month. Edit any cell in place — totals update as you type."
      />
      <Suspense
        fallback={
          <div className="grid gap-5">
            <ControlsSkeleton />
            <Skeleton className="h-16 rounded-xl" />
            <StatCardsSkeleton count={6} />
            <TableSkeleton />
          </div>
        }
      >
        <RevenueContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
