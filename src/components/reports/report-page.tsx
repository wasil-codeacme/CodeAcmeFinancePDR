import { connection } from 'next/server';
import { type ReactNode, Suspense } from 'react';

import { PendingSection } from '@/components/layout/pending-navigation';
import { type ReportTab, ReportToolbar } from '@/components/reports/report-toolbar';
import { ReportTableView } from '@/components/reports/report-table';
import { TableSkeleton } from '@/components/shared/skeletons';
import { SEARCH_PARAM } from '@/lib/constants';
import { toIsoDate } from '@/lib/month';
import { PERMISSION, type Permission, hasPermission } from '@/lib/permissions';
import { type ReportPeriod, parseReportPeriod } from '@/lib/report-period';
import { REPORTS, type ReportKind, reportMeta } from '@/lib/reports';
import { ROUTES } from '@/lib/routes';
import { requireBooksUser } from '@/server/auth/current-user';
import type { SessionUser } from '@/types/auth';
import { cachedReport } from '@/server/cached-reads';

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const CHARTS_TAB: ReportTab = { href: ROUTES.REPORTS.CHARTS, label: 'Charts', report: null };
const REPORT_ROWS = 14;

/** Tabs for the reports this user may see, with Charts after the tables it draws from. */
export async function ReportToolbarLoader() {
  const [user] = await Promise.all([requireBooksUser(PERMISSION.REPORTS_VIEW), connection()]);
  const tabs: ReportTab[] = REPORTS.filter((report) =>
    hasPermission(user.role, report.permission),
  ).map((report) => ({ href: report.href, label: report.title, report: report.kind }));
  tabs.splice(tabs.length - 1, 0, CHARTS_TAB);
  return (
    <ReportToolbar
      tabs={tabs}
      canExport={hasPermission(user.role, PERMISSION.REPORTS_EXPORT)}
      canExportAll={hasPermission(user.role, PERMISSION.DATA_EXPORT)}
      today={toIsoDate(new Date())}
    />
  );
}

/** Resolves the signed-in user and the `?period=` of a report page. */
export async function resolveReportRequest(
  searchParams: SearchParams,
  permission: Permission = PERMISSION.REPORTS_VIEW,
): Promise<{ user: SessionUser; period: ReportPeriod; now: Date; params: Awaited<SearchParams> }> {
  const [user, params] = await Promise.all([
    requireBooksUser(permission),
    searchParams,
    connection(),
  ]);
  const now = new Date();
  return { user, period: parseReportPeriod(params[SEARCH_PARAM.PERIOD], now), now, params };
}

async function ReportContent({
  kind,
  searchParams,
}: {
  kind: ReportKind;
  searchParams: SearchParams;
}) {
  const { user, period, now } = await resolveReportRequest(
    searchParams,
    reportMeta(kind).permission,
  );
  const report = await cachedReport(user, kind, period, toIsoDate(now));
  return (
    <PendingSection fallback={<TableSkeleton rows={REPORT_ROWS} />}>
      <ReportTableView report={report} />
    </PendingSection>
  );
}

/** A report page: its table for the period in the URL, with room for extras below it. */
export function ReportPage({
  kind,
  searchParams,
  children,
}: {
  kind: ReportKind;
  searchParams: SearchParams;
  children?: ReactNode;
}) {
  return (
    <div className="grid gap-6">
      <Suspense fallback={<TableSkeleton rows={REPORT_ROWS} />}>
        <ReportContent kind={kind} searchParams={searchParams} />
      </Suspense>
      {children}
    </div>
  );
}
