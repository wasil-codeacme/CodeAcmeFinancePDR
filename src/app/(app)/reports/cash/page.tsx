import type { Metadata } from 'next';

import { ReportPage } from '@/components/reports/report-page';
import { REPORT_KIND } from '@/lib/reports';

export const metadata: Metadata = { title: 'Cash report' };

export default function CashReportPage({ searchParams }: PageProps<'/reports/cash'>) {
  return <ReportPage kind={REPORT_KIND.CASH} searchParams={searchParams} />;
}
