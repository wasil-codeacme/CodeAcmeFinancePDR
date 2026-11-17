'use client';

import { CalendarClock, HandCoins, MinusCircle, ShieldCheck } from 'lucide-react';

import {
  type AccountOption,
  AdjustReceivableForm,
  ExpectedDateForm,
  RecordReceiptForm,
  ReleaseEscrowForm,
} from '@/components/receivables/receivable-forms';
import { EmptyState } from '@/components/shared/empty-state';
import { FormDialog } from '@/components/shared/form-dialog';
import { Money } from '@/components/shared/money';
import { Badge } from '@/components/ui/badge';
import { IconButton } from '@/components/shared/icon-button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RevenueKind } from '@/generated/prisma/enums';
import { formatDateLabel, formatMonthLabel } from '@/lib/month';
import { cn } from '@/lib/utils';
import type { ReceivableItem } from '@/types/receivable';

type ReceivablesTableProps = { items: ReceivableItem[]; accounts: AccountOption[]; today: string };

function RowActions({
  item,
  accounts,
  today,
  className,
}: {
  item: ReceivableItem;
  accounts: AccountOption[];
  today: string;
  className?: string;
}) {
  const escrowReceipts = item.receipts.filter((receipt) => receipt.isEscrow);
  return (
    <div className={cn('flex justify-end gap-0.5', className)}>
      <FormDialog
        title={`Payment from ${item.clientName}`}
        description="Record money that landed, in full or in part."
        trigger={
          <IconButton size="icon-sm" variant="outline" label="Mark received (full or part)">
            <HandCoins />
          </IconButton>
        }
      >
        {(close) => (
          <RecordReceiptForm
            revenueEntryId={item.id}
            outstanding={item.figures.unfunded}
            accounts={accounts}
            today={today}
            onDone={close}
          />
        )}
      </FormDialog>
      {escrowReceipts.map((receipt) => (
        <FormDialog
          key={receipt.id}
          title="Release escrow"
          description={`Escrow of ${receipt.amount} funded on ${formatDateLabel(receipt.receivedOn)}.`}
          trigger={
            <IconButton size="icon-sm" variant="ghost" label="Release escrow as received">
              <ShieldCheck />
            </IconButton>
          }
        >
          {(close) => (
            <ReleaseEscrowForm
              receiptId={receipt.id}
              accounts={accounts}
              today={today}
              onDone={close}
            />
          )}
        </FormDialog>
      ))}
      <FormDialog
        title="Reduce or write off"
        trigger={
          <IconButton size="icon-sm" variant="ghost" label="Reduce or write off">
            <MinusCircle />
          </IconButton>
        }
      >
        {(close) => <AdjustReceivableForm revenueEntryId={item.id} today={today} onDone={close} />}
      </FormDialog>
      <FormDialog
        title="Move expected date"
        trigger={
          <IconButton size="icon-sm" variant="ghost" label="Move expected date">
            <CalendarClock />
          </IconButton>
        }
      >
        {(close) => (
          <ExpectedDateForm
            revenueEntryId={item.id}
            expectedDate={item.expectedDate ?? today}
            onDone={close}
          />
        )}
      </FormDialog>
    </div>
  );
}

/** PRD §5.2: every open amount across all months, classed as funded escrow or at risk. */
export function ReceivablesTable({ items, accounts, today }: ReceivablesTableProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Nothing outstanding"
        description="Every booked entry has been received or written off."
      />
    );
  }
  return (
    <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead className="hidden md:table-cell">Booked · expected</TableHead>
            <TableHead className="hidden text-right lg:table-cell">Net</TableHead>
            <TableHead className="hidden text-right lg:table-cell">Received</TableHead>
            <TableHead className="text-right">Outstanding</TableHead>
            <TableHead className="hidden sm:table-cell">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="w-full max-w-0">
                <div className="truncate font-medium">{item.clientName}</div>
                <div className="text-muted-foreground flex items-center gap-1 text-xs">
                  <span className="truncate">{item.projectName ?? item.description ?? '—'}</span>
                  {item.kind === RevenueKind.STANDALONE ? (
                    <Badge variant="outline">Not revenue</Badge>
                  ) : null}
                </div>
                {/* On phones the booked/expected column is hidden, so its facts sit here. */}
                <div className="text-muted-foreground text-xs md:hidden">
                  {formatMonthLabel(item.bookingMonth)} · {item.ageingBucket}
                  {item.isOverdue ? ' · overdue' : ''}
                </div>
                <RowActions
                  item={item}
                  accounts={accounts}
                  today={today}
                  className="mt-1 justify-start sm:hidden"
                />
              </TableCell>
              <TableCell className="hidden whitespace-nowrap md:table-cell">
                {formatMonthLabel(item.bookingMonth)}
                <span className="text-muted-foreground block text-xs">
                  {item.ageingBucket}
                  {item.expectedDate ? ` · due ${formatDateLabel(item.expectedDate)}` : ''}
                </span>
                {item.isOverdue ? <Badge variant="destructive">Overdue</Badge> : null}
              </TableCell>
              <TableCell className="hidden text-right lg:table-cell">
                <Money value={item.figures.net} />
              </TableCell>
              <TableCell className="hidden text-right lg:table-cell">
                <Money value={item.figures.received} />
              </TableCell>
              <TableCell className="text-right">
                <Money value={item.figures.outstanding} className="font-semibold" />
                <span className="text-muted-foreground block text-xs whitespace-nowrap">
                  safe <Money value={item.figures.fundedEscrow} />
                </span>
                <span className="text-muted-foreground block text-xs whitespace-nowrap">
                  at risk <Money value={item.figures.unfunded} emphasizeNegative />
                </span>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <RowActions item={item} accounts={accounts} today={today} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
