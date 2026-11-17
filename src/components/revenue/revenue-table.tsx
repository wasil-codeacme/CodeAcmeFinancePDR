'use client';

import { useOptimistic, useTransition } from 'react';
import { toast } from 'sonner';

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
import { sumDecimals } from '@/lib/decimal';
import { MESSAGES } from '@/lib/messages';
import { computeRevenueLine } from '@/server/domain/revenue-math';
import {
  confirmRevenueEntry,
  deleteRevenueEntry,
  updateRevenueEntry,
} from '@/server/actions/books.actions';
import type { ActionResponse } from '@/types/action-response';
import type { RevenueEntryRecord } from '@/types/revenue';

type OptimisticEdit = { id: string; changes: RevenueEdit };

function applyEdit(entries: RevenueEntryRecord[], edit: OptimisticEdit): RevenueEntryRecord[] {
  return entries.map((entry) => (entry.id === edit.id ? { ...entry, ...edit.changes } : entry));
}

type RevenueTableProps = {
  entries: RevenueEntryRecord[];
  canDeleteConfirmed: boolean;
  options: RevenueOptions;
};

/**
 * PRD §5.1 inline editing: an edit is applied to the rows (and so the totals) at once and
 * saved in the background; the server's response then replaces the optimistic rows.
 */
export function RevenueTable({ entries, canDeleteConfirmed, options }: RevenueTableProps) {
  const [optimisticEntries, addOptimisticEdit] = useOptimistic(entries, applyEdit);
  const [isPending, startTransition] = useTransition();

  function persist(
    action: () => Promise<ActionResponse<unknown>>,
    successMessage: string,
    edit?: OptimisticEdit,
  ) {
    startTransition(async () => {
      if (edit) addOptimisticEdit(edit);
      const result = await action();
      if (result.error !== undefined) toast.error(result.error);
      else toast.success(successMessage);
    });
  }

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
    disabled: isPending,
    canDelete: entry.status === EntryStatus.DRAFT || canDeleteConfirmed,
    onEdit: (changes: RevenueEdit) =>
      persist(() => updateRevenueEntry({ id: entry.id, ...changes }), MESSAGES.REVENUE.UPDATED, {
        id: entry.id,
        changes,
      }),
    onConfirm: () =>
      persist(() => confirmRevenueEntry({ id: entry.id }), MESSAGES.REVENUE.CONFIRMED),
    onDelete: () => persist(() => deleteRevenueEntry({ id: entry.id }), MESSAGES.COMMON.DELETED),
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
