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
import { EntryStatus } from '@/generated/prisma/enums';
import { cn } from '@/lib/utils';

function Figure({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="grid gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <Money value={value} className={cn(strong && 'font-semibold')} />
    </div>
  );
}

/** Phone and tablet layout: one card per entry with the same edit controls as the table. */
export function RevenueCard(props: RevenueEntryViewProps) {
  const { entry, figures } = props;
  return (
    <li
      className={cn(
        'bg-card grid gap-3 rounded-xl border p-3 shadow-xs',
        entry.status === EntryStatus.DRAFT && 'border-amber-300/70',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <ClientSummary entry={entry} />
        <EntryActions {...props} />
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="grid gap-1">
          <span className="text-muted-foreground text-xs">Gross</span>
          <GrossInput {...props} />
        </div>
        <FeeInput {...props} />
      </div>
      <div className="grid grid-cols-3 gap-2 border-t pt-3">
        <Figure label="Net" value={figures.net.toString()} strong />
        <Figure label="Received" value={figures.received.toString()} />
        <Figure label="Outstanding" value={figures.outstanding.toString()} />
      </div>
      <StatusControls {...props} />
    </li>
  );
}
