import type { Metadata } from 'next';

import { ReportPage } from '@/components/reports/report-page';
import { REPORT_KIND } from '@/lib/reports';

export const metadata: Metadata = { title: 'Partner distribution' };

export default function DistributionReportPage({
  searchParams,
}: PageProps<'/reports/distribution'>) {
  return <ReportPage kind={REPORT_KIND.DISTRIBUTION} searchParams={searchParams} />;
}
