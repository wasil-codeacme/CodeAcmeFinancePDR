import { PERMISSION, type Permission } from '@/lib/permissions';
import { ROUTES } from '@/lib/routes';

/** The reports of PRD §5.7 and §5.8; each can be viewed for any period and exported. */
export const REPORT_KIND = {
  PNL: 'pnl',
  DISTRIBUTION: 'distribution',
  RECEIVABLES: 'receivables',
  CASH: 'cash',
  SALES_CAC: 'sales-cac',
} as const;
export type ReportKind = (typeof REPORT_KIND)[keyof typeof REPORT_KIND];

export type ReportMeta = {
  kind: ReportKind;
  title: string;
  href: string;
  /** Partner distribution is founders only (PRD §3); the rest any report viewer may see. */
  permission: Permission;
};

export const REPORTS: readonly ReportMeta[] = [
  {
    kind: REPORT_KIND.PNL,
    title: 'P&L statement',
    href: ROUTES.REPORTS.PNL,
    permission: PERMISSION.REPORTS_VIEW,
  },
  {
    kind: REPORT_KIND.DISTRIBUTION,
    title: 'Partner distribution',
    href: ROUTES.REPORTS.DISTRIBUTION,
    permission: PERMISSION.DISTRIBUTION_VIEW,
  },
  {
    kind: REPORT_KIND.RECEIVABLES,
    title: 'Receivables',
    href: ROUTES.REPORTS.RECEIVABLES,
    permission: PERMISSION.REPORTS_VIEW,
  },
  {
    kind: REPORT_KIND.CASH,
    title: 'Cash',
    href: ROUTES.REPORTS.CASH,
    permission: PERMISSION.REPORTS_VIEW,
  },
  {
    kind: REPORT_KIND.SALES_CAC,
    title: 'Sales CAC',
    href: ROUTES.SALES_CAC,
    permission: PERMISSION.REPORTS_VIEW,
  },
];

export function isReportKind(value: string): value is ReportKind {
  return REPORTS.some((report) => report.kind === value);
}

export function reportMeta(kind: ReportKind): ReportMeta {
  const meta = REPORTS.find((report) => report.kind === kind);
  if (!meta) throw new Error(`Unknown report ${kind}`);
  return meta;
}

/** Not a report: every record, for founders (PRD §7). */
export const ALL_DATA_EXPORT = 'all-data';

export const EXPORT_FORMAT = { XLSX: 'xlsx', CSV: 'csv' } as const;
export type ExportFormat = (typeof EXPORT_FORMAT)[keyof typeof EXPORT_FORMAT];

export const EXPORT_CONTENT_TYPE = {
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  CSV: 'text/csv; charset=utf-8',
} as const;
