'use client';

import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { usePendingNavigation } from '@/components/layout/pending-navigation';
import { IconButton } from '@/components/shared/icon-button';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SEARCH_PARAM } from '@/lib/constants';
import {
  PERIOD_KIND,
  type ReportPeriod,
  formatPeriodLabel,
  isPeriodKind,
  parseReportPeriod,
  shiftPeriod,
  toPeriodParam,
  withKind,
} from '@/lib/report-period';
import { ALL_DATA_EXPORT, EXPORT_FORMAT, type ReportKind } from '@/lib/reports';
import { ROUTES, withSearchParams } from '@/lib/routes';
import { cn } from '@/lib/utils';

export type ReportTab = { href: string; label: string; report: ReportKind | null };

const KIND_OPTIONS = [
  { kind: PERIOD_KIND.MONTH, label: 'Month' },
  { kind: PERIOD_KIND.QUARTER, label: 'Quarter' },
  { kind: PERIOD_KIND.YTD, label: 'YTD' },
  { kind: PERIOD_KIND.YEAR, label: 'Year' },
] as const;

function usePeriod(today: string) {
  const searchParams = useSearchParams();
  const now = new Date(today);
  const param = searchParams.get(SEARCH_PARAM.PERIOD) ?? undefined;
  return { now, period: parseReportPeriod(param, now), searchParams };
}

/** PRD §5.7: one switcher for every report — month, quarter, year to date, full year. */
function PeriodPicker({ today }: { today: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { now, period, searchParams } = usePeriod(today);
  const { startTransition } = usePendingNavigation();

  function goTo(next: ReportPeriod) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(SEARCH_PARAM.PERIOD, toPeriodParam(next));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={period.kind}
        onValueChange={(kind) => {
          if (isPeriodKind(kind)) goTo(withKind(period, kind, now));
        }}
        aria-label="Period"
      >
        {KIND_OPTIONS.map((option) => (
          <ToggleGroupItem key={option.kind} value={option.kind} className="px-3">
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="flex items-center gap-1">
        <IconButton
          variant="outline"
          size="icon-sm"
          label="Previous period"
          onClick={() => goTo(shiftPeriod(period, -1))}
        >
          <ChevronLeft />
        </IconButton>
        <span className="min-w-32 px-1 text-center text-sm font-medium tabular-nums">
          {formatPeriodLabel(period, now)}
        </span>
        <IconButton
          variant="outline"
          size="icon-sm"
          label="Next period"
          onClick={() => goTo(shiftPeriod(period, 1))}
        >
          <ChevronRight />
        </IconButton>
      </div>
    </div>
  );
}

type ExportMenuProps = {
  report: ReportKind | null;
  canExportReport: boolean;
  canExportAll: boolean;
  today: string;
};

function ExportMenu({ report, canExportReport, canExportAll, today }: ExportMenuProps) {
  const { period } = usePeriod(today);
  const reportHref = (kind: ReportKind, format: string) =>
    withSearchParams(ROUTES.REPORTS.EXPORT, {
      [SEARCH_PARAM.REPORT]: kind,
      [SEARCH_PARAM.PERIOD]: toPeriodParam(period),
      [SEARCH_PARAM.FORMAT]: format,
    });
  const showReport = report !== null && canExportReport;
  if (!showReport && !canExportAll) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {showReport ? (
          <>
            <DropdownMenuItem asChild>
              <a href={reportHref(report, EXPORT_FORMAT.XLSX)} download>
                This report, Excel (.xlsx)
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={reportHref(report, EXPORT_FORMAT.CSV)} download>
                This report, CSV
              </a>
            </DropdownMenuItem>
          </>
        ) : null}
        {showReport && canExportAll ? <DropdownMenuSeparator /> : null}
        {canExportAll ? (
          <DropdownMenuItem asChild>
            <a
              href={withSearchParams(ROUTES.REPORTS.EXPORT, {
                [SEARCH_PARAM.REPORT]: ALL_DATA_EXPORT,
                [SEARCH_PARAM.FORMAT]: EXPORT_FORMAT.XLSX,
              })}
              download
            >
              All data, Excel (.xlsx)
            </a>
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type ReportToolbarProps = {
  tabs: ReportTab[];
  canExport: boolean;
  canExportAll: boolean;
  today: string;
};

/** Report tabs keep the chosen period, so switching report never resets it. */
export function ReportToolbar({ tabs, canExport, canExportAll, today }: ReportToolbarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const periodParam = searchParams.get(SEARCH_PARAM.PERIOD) ?? undefined;
  const active = tabs.find((tab) => tab.href === pathname);
  return (
    <div className="grid gap-4">
      <nav
        className="-mx-4 flex gap-1 overflow-x-auto border-b px-4 md:mx-0 md:px-0"
        aria-label="Reports"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={withSearchParams(tab.href, { [SEARCH_PARAM.PERIOD]: periodParam })}
            aria-current={tab === active ? 'page' : undefined}
            className={cn(
              'text-muted-foreground hover:text-foreground -mb-px border-b-2 border-transparent px-3 py-2 text-sm whitespace-nowrap',
              tab === active && 'border-foreground text-foreground font-medium',
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PeriodPicker today={today} />
        <ExportMenu
          report={active?.report ?? null}
          canExportReport={canExport}
          canExportAll={canExportAll}
          today={today}
        />
      </div>
    </div>
  );
}
