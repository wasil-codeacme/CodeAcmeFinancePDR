import Link from 'next/link';

import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SEARCH_PARAM } from '@/lib/constants';
import { formatCurrency, formatRatioAsPercent } from '@/lib/format';
import type { ReportColumn } from '@/lib/report-period';
import { ROUTES, withSearchParams } from '@/lib/routes';
import { cn } from '@/lib/utils';
import {
  type DrillTarget,
  ROW_TONE,
  type ReportRow,
  type ReportTable,
  type RowTone,
  VALUE_FORMAT,
} from '@/types/report';

const NO_VALUE = '—';

const TONE_CLASS: Record<RowTone, string> = {
  [ROW_TONE.NORMAL]: '',
  [ROW_TONE.SUBTOTAL]: 'font-medium',
  [ROW_TONE.TOTAL]: 'bg-muted/30 font-semibold',
  [ROW_TONE.MUTED]: 'text-muted-foreground',
};

function formatValue(row: ReportRow, value: string | null, currency: string): string {
  if (value === null) return NO_VALUE;
  if (row.format === VALUE_FORMAT.PERCENT) return formatRatioAsPercent(value);
  if (row.format === VALUE_FORMAT.COUNT) return Number(value).toLocaleString('en-US');
  return formatCurrency(value, row.currency ?? currency);
}

function drillHref(drill: DrillTarget, column: ReportColumn): string {
  return withSearchParams(ROUTES.REPORTS.ENTRIES, {
    [SEARCH_PARAM.PERIOD]: column.param,
    [SEARCH_PARAM.FIGURE]: drill.figure,
    [SEARCH_PARAM.LINE]: drill.line,
    [SEARCH_PARAM.FUNDING]: drill.funding,
  });
}

function ValueCell({
  row,
  column,
  value,
  currency,
}: {
  row: ReportRow;
  column: ReportColumn;
  value: string | null;
  currency: string;
}) {
  const text = formatValue(row, value, currency);
  const negative = row.tone === ROW_TONE.TOTAL && text.startsWith('-');
  const content = <span className={cn(negative && 'text-destructive')}>{text}</span>;
  return (
    <TableCell
      className={cn(
        'text-right whitespace-nowrap tabular-nums',
        !column.isTotal && 'hidden sm:table-cell',
        column.isTotal && 'font-medium',
      )}
    >
      {row.drill && value !== null ? (
        // Prefetching every figure's drill-down would fetch dozens of pages for nothing.
        <Link
          href={drillHref(row.drill, column)}
          prefetch={false}
          className="decoration-muted-foreground/50 underline-offset-4 hover:underline"
          title={`See the entries behind ${row.label} (${column.label})`}
        >
          {content}
        </Link>
      ) : (
        content
      )}
    </TableCell>
  );
}

/**
 * Every report in one layout: a label column, one column per month or quarter, and the
 * period total. Phones show the label and the total; wider screens show every column.
 */
export function ReportTableView({ report }: { report: ReportTable }) {
  const columnCount = report.columns.length + 1;
  return (
    <div className="grid gap-4">
      {report.warnings.map((warning) => (
        <Alert key={warning}>
          <AlertDescription>{warning}</AlertDescription>
        </Alert>
      ))}
      <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
        <Table className="table-fixed sm:table-auto">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[55%] sm:w-auto">{report.periodLabel}</TableHead>
              {report.columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    'text-right whitespace-nowrap',
                    !column.isTotal && 'hidden sm:table-cell',
                  )}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          {report.sections.map((section) => (
            <TableBody key={section.key}>
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columnCount} className="bg-muted/40 py-1.5">
                  <span className="text-xs font-semibold tracking-wide uppercase">
                    {section.title}
                  </span>
                  {section.note ? (
                    <span className="text-muted-foreground ml-2 hidden text-xs md:inline">
                      {section.note}
                    </span>
                  ) : null}
                </TableCell>
              </TableRow>
              {section.rows.map((row) => (
                <TableRow key={row.key} className={TONE_CLASS[row.tone]}>
                  <TableCell className="truncate">{row.label}</TableCell>
                  {report.columns.map((column, index) => (
                    <ValueCell
                      key={column.key}
                      row={row}
                      column={column}
                      value={row.values[index] ?? null}
                      currency={report.currency}
                    />
                  ))}
                </TableRow>
              ))}
            </TableBody>
          ))}
        </Table>
      </div>
      <p className="text-muted-foreground text-xs">
        Click a figure to see the entries behind it.
        <span className="sm:hidden"> Turn your phone or use a wider screen to see each month.</span>
      </p>
    </div>
  );
}
