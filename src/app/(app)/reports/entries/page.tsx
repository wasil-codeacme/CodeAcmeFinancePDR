import type { Metadata } from 'next';
import { Suspense } from 'react';

import { PendingSection } from '@/components/layout/pending-navigation';
import { DrillDownTable } from '@/components/reports/drill-down-table';
import { resolveReportRequest } from '@/components/reports/report-page';
import { TableSkeleton } from '@/components/shared/skeletons';
import { getDrillDown } from '@/server/services/drill-down.service';
import { drillQuerySchema } from '@/server/validators/report.schema';

export const metadata: Metadata = { title: 'Entries behind a figure' };

async function Entries({ searchParams }: Pick<PageProps<'/reports/entries'>, 'searchParams'>) {
  const { user, period, now, params } = await resolveReportRequest(searchParams);
  const query = drillQuerySchema.parse(params);
  const view = await getDrillDown(user, period, query, now);
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
