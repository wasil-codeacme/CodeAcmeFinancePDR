'use client';

import {
  ClientSummary,
  EntryActions,
  FeeInput,
  GrossInput,
  type RevenueEntryViewProps,
  StatusControls,
} from '@/components/revenue/revenue-entry-parts';
import { Money } from '@/components/shared/money';
import { TableCell, TableRow } from '@/components/ui/table';
import { EntryStatus } from '@/generated/prisma/enums';

/** Desktop row: eight compact columns, so the table fits without scrolling sideways. */
export function RevenueRow(props: RevenueEntryViewProps) {
  const { entry, figures } = props;
  return (
    <TableRow
      className={
        entry.status === EntryStatus.DRAFT ? 'bg-amber-50/60 dark:bg-amber-950/20' : undefined
      }
    >
      <TableCell className="max-w-56">
        <ClientSummary entry={entry} />
      </TableCell>
      <TableCell className="text-right">
        <GrossInput {...props} />
      </TableCell>
      <TableCell className="text-right">
        <FeeInput {...props} />
      </TableCell>
      <TableCell className="text-right font-medium">
        <Money value={figures.net} />
      </TableCell>
      <TableCell className="text-right">
        <Money value={figures.received} />
      </TableCell>
      <TableCell className="text-right">
        <Money value={figures.outstanding} />
      </TableCell>
      <TableCell>
        <StatusControls {...props} />
      </TableCell>
      <TableCell>
        <EntryActions {...props} />
      </TableCell>
    </TableRow>
  );
}
