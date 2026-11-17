import type { Metadata } from 'next';

import { ReportPage } from '@/components/reports/report-page';
import { REPORT_KIND } from '@/lib/reports';

export const metadata: Metadata = { title: 'Receivables report' };

export default function ReceivablesReportPage({ searchParams }: PageProps<'/reports/receivables'>) {
  return <ReportPage kind={REPORT_KIND.RECEIVABLES} searchParams={searchParams} />;
}
