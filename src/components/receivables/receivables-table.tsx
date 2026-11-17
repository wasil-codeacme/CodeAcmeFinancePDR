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
import { Button } from '@/components/ui/button';
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
import type { ReceivableItem } from '@/types/receivable';

type ReceivablesTableProps = { items: ReceivableItem[]; accounts: AccountOption[]; today: string };

function RowActions({
  item,
  accounts,
  today,
}: {
  item: ReceivableItem;
  accounts: AccountOption[];
  today: string;
}) {
  const escrowReceipts = item.receipts.filter((receipt) => receipt.isEscrow);
  return (
    <div className="flex flex-wrap justify-end gap-1">
      <FormDialog
        title={`Payment from ${item.clientName}`}
        description="Record money that landed, in full or in part."
        trigger={
          <Button size="sm" variant="outline">
            <HandCoins /> Received
          </Button>
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
            <Button size="sm" variant="ghost">
              <ShieldCheck /> Release
            </Button>
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
          <Button size="icon-sm" variant="ghost" aria-label="Reduce or write off">
            <MinusCircle />
          </Button>
        }
      >
        {(close) => <AdjustReceivableForm revenueEntryId={item.id} today={today} onDone={close} />}
      </FormDialog>
      <FormDialog
        title="Move expected date"
        trigger={
          <Button size="icon-sm" variant="ghost" aria-label="Move expected date">
            <CalendarClock />
          </Button>
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
    <div className="bg-card overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Booked</TableHead>
            <TableHead className="text-right">Net</TableHead>
            <TableHead className="text-right">Received</TableHead>
            <TableHead className="text-right">Escrow (safe)</TableHead>
            <TableHead className="text-right">At risk</TableHead>
            <TableHead className="text-right">Outstanding</TableHead>
            <TableHead>Expected</TableHead>
            <TableHead className="sr-only">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="min-w-44">
                <div className="font-medium">{item.clientName}</div>
                <div className="text-muted-foreground flex items-center gap-1 text-xs">
                  {item.projectName ?? item.description ?? '—'}
                  {item.kind === RevenueKind.STANDALONE ? (
                    <Badge variant="outline">Not revenue</Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatMonthLabel(item.bookingMonth)}
                <span className="text-muted-foreground block text-xs">{item.ageingBucket}</span>
              </TableCell>
              <TableCell className="text-right">
                <Money value={item.figures.net} />
              </TableCell>
              <TableCell className="text-right">
                <Money value={item.figures.received} />
              </TableCell>
              <TableCell className="text-right">
                <Money value={item.figures.fundedEscrow} />
              </TableCell>
              <TableCell className="text-right">
                <Money value={item.figures.unfunded} emphasizeNegative />
              </TableCell>
              <TableCell className="text-right font-semibold">
                <Money value={item.figures.outstanding} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {item.expectedDate ? formatDateLabel(item.expectedDate) : '—'}
                {item.isOverdue ? (
                  <Badge variant="destructive" className="ml-1">
                    Overdue
                  </Badge>
                ) : null}
              </TableCell>
              <TableCell>
                <RowActions item={item} accounts={accounts} today={today} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
