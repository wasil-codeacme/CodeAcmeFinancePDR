import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { AddStandaloneReceivableButton } from '@/components/receivables/standalone-receivable-form';
import { ReceivablesTable } from '@/components/receivables/receivables-table';
import { Money } from '@/components/shared/money';
import { PageHeader } from '@/components/shared/page-header';
import { ReceivablesBreakdown } from '@/components/shared/receivables-breakdown';
import { StatCardsSkeleton, TableSkeleton } from '@/components/shared/skeletons';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { currentMonthKey, toIsoDate } from '@/lib/month';
import { PERMISSION } from '@/lib/permissions';
import { requireBooksUser } from '@/server/auth/current-user';
import { listClients } from '@/server/services/client.service';
import { getReceivables } from '@/server/services/receivable.service';
import { listAccounts } from '@/server/services/settings.service';

export const metadata: Metadata = { title: 'Receivables' };

async function ReceivablesContent() {
  await Promise.all([requireBooksUser(PERMISSION.ENTRIES_WRITE), connection()]);
  const now = new Date();
  const [view, accounts, clients] = await Promise.all([
    getReceivables(now),
    listAccounts(),
    listClients(),
  ]);
  const today = toIsoDate(now);
  return (
    <div className="grid gap-5">
      <div className="flex justify-end">
        <AddStandaloneReceivableButton
          clients={clients
            .filter((client) => client.active)
            .map((client) => ({ value: client.id, label: client.name }))}
          month={currentMonthKey(now)}
          today={today}
        />
      </div>
      <ReceivablesBreakdown totals={view.totals} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {view.ageing.map((bucket) => (
          <Card key={bucket.bucket} size="sm">
            <CardContent className="grid gap-1">
              <span className="text-muted-foreground text-xs">Outstanding · {bucket.bucket}</span>
              <Money value={bucket.outstanding} className="text-base font-semibold" />
            </CardContent>
          </Card>
        ))}
      </div>
      <ReceivablesTable
        items={view.items}
        accounts={accounts
          .filter((account) => account.active)
          .map((account) => ({ value: account.id, label: account.name }))}
        today={today}
      />
    </div>
  );
}

export default function ReceivablesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Books"
        title="Receivables"
        description="Everything still owed, across all months. Totals and collection rate cover booked revenue."
      />
      <Suspense
        fallback={
          <div className="grid gap-5">
            <Skeleton className="ml-auto h-8 w-36 rounded-lg" />
            <StatCardsSkeleton count={6} />
            <StatCardsSkeleton />
            <TableSkeleton />
          </div>
        }
      >
        <ReceivablesContent />
      </Suspense>
    </>
  );
}
