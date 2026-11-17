import Link from 'next/link';

import { EmptyState } from '@/components/shared/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/format';
import { formatDateLabel, formatMonthLabel, isMonthKey } from '@/lib/month';
import { cn } from '@/lib/utils';
import {
  CELL_FORMAT,
  type DrillCell,
  type DrillColumn,
  type DrillDownView,
} from '@/types/drill-down';

function cellText(column: DrillColumn, cell: DrillCell | undefined, currency: string): string {
  const value = cell?.value ?? null;
  if (value === null || value === '') return '—';
  if (column.format === CELL_FORMAT.MONEY) return formatCurrency(value, cell?.currency ?? currency);
  if (column.format === CELL_FORMAT.DATE) return formatDateLabel(value);
  if (column.format === CELL_FORMAT.MONTH && isMonthKey(value)) {
    return formatMonthLabel(value);
  }
  return value;
}

function columnClass(column: DrillColumn): string {
  return cn(
    column.format === CELL_FORMAT.MONEY && 'text-right tabular-nums whitespace-nowrap',
    column.hideOnPhone && 'hidden md:table-cell',
  );
}

/** The entries behind one report figure; each row opens the month it belongs to. */
export function DrillDownTable({ view }: { view: DrillDownView }) {
  if (view.rows.length === 0) {
    return (
      <EmptyState
        title="No entries"
        description={`Nothing behind this figure for ${view.periodLabel}.`}
      />
    );
  }
  return (
    <div className="grid gap-3">
      <h2 className="text-base font-semibold">
        {view.title} <span className="text-muted-foreground font-normal">· {view.periodLabel}</span>
      </h2>
      <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              {view.columns.map((column) => (
                <TableHead key={column.key} className={columnClass(column)}>
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {view.rows.map((row) => (
              <TableRow key={row.id}>
                {view.columns.map((column, index) => (
                  <TableCell
                    key={column.key}
                    className={cn(columnClass(column), 'max-w-64 truncate')}
                  >
                    {index === 1 ? (
                      <Link href={row.href} prefetch={false} className="hover:underline">
                        {cellText(column, row.cells[index], view.currency)}
                      </Link>
                    ) : (
                      cellText(column, row.cells[index], view.currency)
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              {view.columns.map((column, index) => (
                <TableCell key={column.key} className={cn(columnClass(column), 'font-semibold')}>
                  {index === 0
                    ? `${view.rows.length} ${view.rows.length === 1 ? 'entry' : 'entries'}`
                    : view.totals[index]
                      ? formatCurrency(view.totals[index], view.currency)
                      : ''}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      <p className="text-muted-foreground text-xs">
        Totals are in the report currency at each month&apos;s rate, so they match the report. Click
        an entry to open its month.
      </p>
    </div>
  );
}
