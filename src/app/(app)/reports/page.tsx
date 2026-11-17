import type { Metadata } from 'next';

import { ReportPage } from '@/components/reports/report-page';
import { REPORT_KIND } from '@/lib/reports';

export const metadata: Metadata = { title: 'P&L statement' };

export default function PnlReportPage({ searchParams }: PageProps<'/reports'>) {
  return <ReportPage kind={REPORT_KIND.PNL} searchParams={searchParams} />;
}
