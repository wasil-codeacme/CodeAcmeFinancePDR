import { Suspense } from 'react';

import { ReportToolbarLoader } from '@/components/reports/report-page';
import { PageHeader } from '@/components/shared/page-header';
import { ControlsSkeleton } from '@/components/shared/skeletons';

export default function ReportsLayout({ children }: LayoutProps<'/reports'>) {
  return (
    <>
      <PageHeader
        eyebrow="Reports"
        title="Reports"
        description="Every figure by month, quarter, year to date or full year. Closed months use the figures they were closed with."
      />
      <div className="grid gap-5">
        <Suspense fallback={<ControlsSkeleton />}>
          <ReportToolbarLoader />
        </Suspense>
        {children}
      </div>
    </>
  );
}
