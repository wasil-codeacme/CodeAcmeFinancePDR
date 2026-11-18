import type { Metadata } from 'next';
import { toIsoDate } from '@/lib/month';
import { Suspense } from 'react';

import { PendingSection } from '@/components/layout/pending-navigation';
import { ReportCharts } from '@/components/reports/charts/report-charts';
import { resolveReportRequest } from '@/components/reports/report-page';
import { CardListSkeleton } from '@/components/shared/skeletons';
import { cachedCharts } from '@/server/cached-reads';

export const metadata: Metadata = { title: 'Charts' };

const CHART_COUNT = 6;

async function Charts({ searchParams }: Pick<PageProps<'/reports/charts'>, 'searchParams'>) {
  const { user, period, now } = await resolveReportRequest(searchParams);
  const view = await cachedCharts(user, period, toIsoDate(now));
  return (
    <PendingSection fallback={<CardListSkeleton count={CHART_COUNT} />}>
      <ReportCharts view={view} />
    </PendingSection>
  );
}

export default function ChartsPage({ searchParams }: PageProps<'/reports/charts'>) {
  return (
    <Suspense fallback={<CardListSkeleton count={CHART_COUNT} />}>
      <Charts searchParams={searchParams} />
    </Suspense>
  );
}
