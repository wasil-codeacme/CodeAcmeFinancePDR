import type { Metadata } from 'next';
import { Suspense } from 'react';

import { PendingSection } from '@/components/layout/pending-navigation';
import { ReportPage, resolveReportRequest } from '@/components/reports/report-page';
import { SalesActivityEditor } from '@/components/reports/sales-activity-editor';
import { FormCardSkeleton } from '@/components/shared/skeletons';
import { type MonthKey, compareMonthKeys, currentMonthKey } from '@/lib/month';
import { PERMISSION, hasPermission } from '@/lib/permissions';
import { PERIOD_KIND, type ReportPeriod, periodMonths } from '@/lib/report-period';
import { REPORT_KIND } from '@/lib/reports';
import { cachedSalesActivity } from '@/server/cached-reads';

export const metadata: Metadata = { title: 'Sales CAC' };

/** The month to enter counts for: the chosen month, or the latest month of the period so far. */
function activityMonth(period: ReportPeriod, now: Date): MonthKey {
  if (period.kind === PERIOD_KIND.MONTH) return period.month;
  const current = currentMonthKey(now);
  const months = periodMonths(period, now).filter((month) => compareMonthKeys(month, current) <= 0);
  return months.at(-1) ?? current;
}

async function Activity({ searchParams }: Pick<PageProps<'/reports/sales-cac'>, 'searchParams'>) {
  const { user, period, now } = await resolveReportRequest(searchParams);
  const month = activityMonth(period, now);
  const rows = await cachedSalesActivity(month);
  return (
    <PendingSection fallback={<FormCardSkeleton />}>
      <SalesActivityEditor
        month={month}
        rows={rows}
        canEdit={hasPermission(user.role, PERMISSION.ENTRIES_WRITE)}
      />
    </PendingSection>
  );
}

export default function SalesCacPage({ searchParams }: PageProps<'/reports/sales-cac'>) {
  return (
    <ReportPage kind={REPORT_KIND.SALES_CAC} searchParams={searchParams}>
      <Suspense fallback={<FormCardSkeleton />}>
        <Activity searchParams={searchParams} />
      </Suspense>
    </ReportPage>
  );
}
