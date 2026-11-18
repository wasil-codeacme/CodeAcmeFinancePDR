import type { Metadata } from 'next';
import { toIsoDate } from '@/lib/month';
import { Suspense } from 'react';

import { PendingSection } from '@/components/layout/pending-navigation';
import { DrillDownTable } from '@/components/reports/drill-down-table';
import { resolveReportRequest } from '@/components/reports/report-page';
import { TableSkeleton } from '@/components/shared/skeletons';
import { drillQuerySchema } from '@/server/validators/report.schema';
import { cachedDrillDown } from '@/server/cached-reads';

export const metadata: Metadata = { title: 'Entries behind a figure' };

async function Entries({ searchParams }: Pick<PageProps<'/reports/entries'>, 'searchParams'>) {
  const { user, period, now, params } = await resolveReportRequest(searchParams);
  const query = drillQuerySchema.parse(params);
  const view = await cachedDrillDown(user, period, query, toIsoDate(now));
  return (
    <PendingSection fallback={<TableSkeleton />}>
      <DrillDownTable view={view} />
    </PendingSection>
  );
}

export default function EntriesPage({ searchParams }: PageProps<'/reports/entries'>) {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Entries searchParams={searchParams} />
    </Suspense>
  );
}
