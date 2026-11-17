'use client';

import { RevenueCard } from '@/components/revenue/revenue-card';
import type { RevenueOptions } from '@/components/revenue/revenue-details-form';
import type { RevenueEdit } from '@/components/revenue/revenue-entry-parts';
import { RevenueRow } from '@/components/revenue/revenue-row';
import { EmptyState } from '@/components/shared/empty-state';
import { Money } from '@/components/shared/money';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EntryStatus } from '@/generated/prisma/enums';
import { useOptimisticList } from '@/hooks/use-optimistic-list';
import { sumDecimals } from '@/lib/decimal';
import { MESSAGES } from '@/lib/messages';
import { computeRevenueLine } from '@/server/domain/revenue-math';
import {
  confirmRevenueEntry,
  deleteRevenueEntry,
  updateRevenueEntry,
} from '@/server/actions/books.actions';
import type { RevenueEntryRecord } from '@/types/revenue';

type RevenueTableProps = {
  entries: RevenueEntryRecord[];
  canDeleteConfirmed: boolean;
  options: RevenueOptions;
};

/**
 * PRD §5.1 inline editing: edits, confirms and deletes show on the rows (and so the totals)
 * at once and save in the background; the server's response then replaces the optimistic rows.
 */
export function RevenueTable({ entries, canDeleteConfirmed, options }: RevenueTableProps) {
  const { rows: optimisticEntries, mutate } = useOptimisticList(entries);

  if (entries.length === 0) {
    return (
      <EmptyState
        title="No revenue booked this month"
        description="Add a line above or copy last month's in-progress projects."
      />
    );
  }

  const rows = optimisticEntries.map((entry) => ({ entry, figures: computeRevenueLine(entry) }));
  const confirmed = rows.filter((row) => row.entry.status === EntryStatus.CONFIRMED);
  const total = (
    pick: (figures: (typeof rows)[number]['figures']) => Parameters<typeof sumDecimals>[0][number],
  ) => sumDecimals(confirmed.map((row) => pick(row.figures)));

  const viewProps = (entry: RevenueEntryRecord, figures: (typeof rows)[number]['figures']) => ({
    entry,
    figures,
    options,
    canDelete: entry.status === EntryStatus.DRAFT || canDeleteConfirmed,
    onEdit: (changes: RevenueEdit) =>
      mutate(
        { type: 'update', id: entry.id, patch: changes },
        () => updateRevenueEntry({ id: entry.id, ...changes }),
        MESSAGES.REVENUE.UPDATED,
      ),
    onConfirm: () =>
      mutate(
        { type: 'update', id: entry.id, patch: { status: EntryStatus.CONFIRMED } },
        () => confirmRevenueEntry({ id: entry.id }),
        MESSAGES.REVENUE.CONFIRMED,
      ),
    onDelete: () =>
      mutate(
        { type: 'remove', id: entry.id },
        () => deleteRevenueEntry({ id: entry.id }),
        MESSAGES.COMMON.DELETED,
      ),
  });

  return (
    <>
      {/* Below xl the eight columns do not fit beside the sidebar, so entries become cards. */}
      <div className="grid gap-3 xl:hidden">
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map(({ entry, figures }) => (
            <RevenueCard key={entry.id} {...viewProps(entry, figures)} />
          ))}
        </ul>
        <div className="bg-card grid grid-cols-2 gap-2 rounded-xl border p-3 text-sm shadow-xs sm:grid-cols-4">
          <span className="text-muted-foreground col-span-full text-xs">Totals (confirmed)</span>
          <span>
            Gross <Money value={total((figures) => figures.gross)} className="block font-medium" />
          </span>
          <span>
            Net <Money value={total((figures) => figures.net)} className="block font-semibold" />
          </span>
          <span>
            Received{' '}
            <Money value={total((figures) => figures.received)} className="block font-medium" />
          </span>
          <span>
            Outstanding{' '}
            <Money value={total((figures) => figures.outstanding)} className="block font-medium" />
          </span>
        </div>
      </div>
      <div className="bg-card hidden overflow-hidden rounded-xl border shadow-xs xl:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client / project</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">Fee</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead className="text-right">Received</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="sr-only">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ entry, figures }) => (
              <RevenueRow key={entry.id} {...viewProps(entry, figures)} />
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-medium">Totals (confirmed)</TableCell>
              <TableCell className="text-right">
                <Money value={total((figures) => figures.gross)} />
              </TableCell>
              <TableCell className="text-right">
                <Money value={total((figures) => figures.fee)} />
              </TableCell>
              <TableCell className="text-right font-semibold">
                <Money value={total((figures) => figures.net)} />
              </TableCell>
              <TableCell className="text-right">
                <Money value={total((figures) => figures.received)} />
              </TableCell>
              <TableCell className="text-right">
                <Money value={total((figures) => figures.outstanding)} />
              </TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </>
  );
}
