import type { Decimal } from '@/lib/decimal';
import { type MonthKey, addMonths } from '@/lib/month';
import { PERMISSION, hasPermission } from '@/lib/permissions';
import {
  type ReportColumn,
  type ReportPeriod,
  displayColumns,
  exportColumns,
  formatPeriodLabel,
  periodMonths,
  toPeriodParam,
} from '@/lib/report-period';
import {
  EXPORT_CONTENT_TYPE,
  EXPORT_FORMAT,
  type ExportFormat,
  REPORT_KIND,
  type ReportKind,
  reportMeta,
} from '@/lib/reports';
import { spreadsheetWriter } from '@/server/container';
import { ForbiddenError, NotFoundError } from '@/server/errors';
import { toCsv } from '@/server/export/csv';
import { reportToSheet } from '@/server/export/report-sheet';
import { loadCashMonths } from '@/server/read-models/account-timelines';
import { loadBookedFigures, loadMonthlyPnls } from '@/server/read-models/report-data';
import { loadSalesCac } from '@/server/read-models/sales-cac';
import { companyRepository } from '@/server/repositories/company.repository';
import { buildCashSections, missingCashWarning } from '@/server/reports/cash-report';
import { buildDistributionSections } from '@/server/reports/distribution-report';
import {
  buildPnlSections,
  missingMonthsWarning,
  totalsByColumn,
} from '@/server/reports/pnl-report';
import { buildReceivablesSections, receivablesByColumn } from '@/server/reports/receivables-report';
import { buildSalesCacSections } from '@/server/reports/sales-cac-report';
import type { SessionUser } from '@/types/auth';
import type { ExportFile } from '@/types/export';
import type { ReportSection, ReportTable } from '@/types/report';

/** On screen, years show quarters; exports carry every month with quarter and year totals. */
export const COLUMN_MODE = { DISPLAY: 'display', EXPORT: 'export' } as const;
export type ColumnMode = (typeof COLUMN_MODE)[keyof typeof COLUMN_MODE];

type ReportContext = {
  period: ReportPeriod;
  now: Date;
  columns: ReportColumn[];
  months: MonthKey[];
  user: SessionUser;
};

type Built = { sections: ReportSection[]; warnings: string[] };

async function currencies() {
  const company = await companyRepository.find();
  if (!company) throw new NotFoundError();
  return { reporting: company.reportingCurrency, display: company.displayCurrency };
}

async function pnlReport({ columns, months }: ReportContext): Promise<Built> {
  const totals = totalsByColumn(columns, await loadMonthlyPnls(months, false));
  return { sections: buildPnlSections(totals), warnings: missingMonthsWarning(totals) };
}

/** January of the period's last year through its end, so cumulative reserves start in January. */
function yearToEnd(months: readonly MonthKey[]): MonthKey[] {
  const last = months.at(-1);
  if (!last) return [];
  const january = `${last.slice(0, 4)}-01` as MonthKey;
  const span: MonthKey[] = [];
  for (let month = january; month <= last; month = addMonths(month, 1)) span.push(month);
  return [...new Set([...months, ...span])].sort();
}

async function distributionReport({ columns, months, user }: ReportContext): Promise<Built> {
  if (!hasPermission(user.role, PERMISSION.DISTRIBUTION_VIEW)) throw new ForbiddenError();
  const [monthly, { display }] = await Promise.all([
    loadMonthlyPnls(yearToEnd(months), true),
    currencies(),
  ]);
  const reservesByMonth = new Map<MonthKey, Decimal>(
    [...monthly.entries()].flatMap(([month, pnl]) =>
      pnl?.distribution ? [[month, pnl.distribution.totalReserves] as const] : [],
    ),
  );
  const pnlWarnings = missingMonthsWarning(totalsByColumn(columns, monthly));
  return {
    sections: buildDistributionSections({
      columns,
      monthly,
      reservesByMonth,
      displayCurrency: display,
    }),
    warnings: pnlWarnings,
  };
}

async function receivablesReport({ columns, months }: ReportContext): Promise<Built> {
  const totals = receivablesByColumn(columns, await loadBookedFigures(months));
  return { sections: buildReceivablesSections(totals), warnings: [] };
}

async function cashReport({ columns, months, user }: ReportContext): Promise<Built> {
  const first = months[0];
  const withOpening = first ? [addMonths(first, -1), ...months] : [];
  const { cash, accounts } = await loadCashMonths(withOpening);
  return {
    sections: buildCashSections({
      columns,
      cash,
      accounts,
      showPartnerMovements: hasPermission(user.role, PERMISSION.DISTRIBUTION_VIEW),
    }),
    warnings: missingCashWarning({ columns, cash }),
  };
}

async function salesCacReport({ columns, months }: ReportContext): Promise<Built> {
  const data = await loadSalesCac(months);
  return { sections: buildSalesCacSections(columns, data), warnings: data.warnings };
}

const BUILDERS: Record<ReportKind, (context: ReportContext) => Promise<Built>> = {
  [REPORT_KIND.PNL]: pnlReport,
  [REPORT_KIND.DISTRIBUTION]: distributionReport,
  [REPORT_KIND.RECEIVABLES]: receivablesReport,
  [REPORT_KIND.CASH]: cashReport,
  [REPORT_KIND.SALES_CAC]: salesCacReport,
};

/** Excel reads a CSV as UTF-8 only when it starts with a byte-order mark (e.g. for "Rs" and "—"). */
const UTF8_BOM = '﻿';

/** Any report for any period, in the one table shape the screen and the exports share. */
export async function getReport(
  user: SessionUser,
  kind: ReportKind,
  period: ReportPeriod,
  now: Date,
  mode: ColumnMode = COLUMN_MODE.DISPLAY,
): Promise<ReportTable> {
  const meta = reportMeta(kind);
  if (!hasPermission(user.role, meta.permission)) throw new ForbiddenError();
  const columns =
    mode === COLUMN_MODE.EXPORT ? exportColumns(period, now) : displayColumns(period, now);
  const months = periodMonths(period, now);
  const [built, { reporting }] = await Promise.all([
    BUILDERS[kind]({ period, now, columns, months, user }),
    currencies(),
  ]);
  return {
    title: meta.title,
    periodLabel: formatPeriodLabel(period, now),
    currency: reporting,
    columns,
    sections: built.sections,
    warnings: built.warnings,
  };
}

/**
 * PRD §5.7 export to XLSX or CSV, respecting role permissions: the same table as on
 * screen (so founder-only reports stay founder-only), with every month plus quarter and
 * year totals.
 */
export async function exportReport(
  user: SessionUser,
  kind: ReportKind,
  period: ReportPeriod,
  now: Date,
  format: ExportFormat,
): Promise<ExportFile> {
  if (!hasPermission(user.role, PERMISSION.REPORTS_EXPORT)) throw new ForbiddenError();
  const sheet = reportToSheet(await getReport(user, kind, period, now, COLUMN_MODE.EXPORT));
  const filename = `codeacme-${kind}-${toPeriodParam(period)}`;
  if (format === EXPORT_FORMAT.CSV) {
    return {
      filename: `${filename}.csv`,
      contentType: EXPORT_CONTENT_TYPE.CSV,
      body: UTF8_BOM + toCsv(sheet.rows),
    };
  }
  return {
    filename: `${filename}.xlsx`,
    contentType: EXPORT_CONTENT_TYPE.XLSX,
    body: await spreadsheetWriter.write([sheet]),
  };
}
