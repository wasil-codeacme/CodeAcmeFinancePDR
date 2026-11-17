'use client';

import { Check, Trash2 } from 'lucide-react';

import { InlineSelectCell, InlineTextCell } from '@/components/revenue/inline-cells';
import { ConfirmActionButton } from '@/components/shared/confirm-action-button';
import { Money } from '@/components/shared/money';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { EntryStatus, type InvoiceStatus, type ProjectStatus } from '@/generated/prisma/enums';
import type { RevenueLineFigures } from '@/server/domain/revenue-math';
import { MONEY_INPUT_PATTERN, PERCENT_INPUT_PATTERN } from '@/lib/input-patterns';
import { INVOICE_STATUS_LABEL, PROJECT_STATUS_LABEL, optionsFrom } from '@/lib/labels';
import { MESSAGES } from '@/lib/messages';
import type { RevenueEntryRecord } from '@/types/revenue';

export type RevenueEdit = Partial<{
  gross: string;
  feePercent: string;
  projectStatus: ProjectStatus;
  invoiceStatus: InvoiceStatus;
  referredBy: string;
}>;

type RevenueRowProps = {
  entry: RevenueEntryRecord;
  figures: RevenueLineFigures;
  disabled: boolean;
  canDelete: boolean;
  onEdit: (changes: RevenueEdit) => void;
  onConfirm: () => void;
  onDelete: () => void;
};

const PROJECT_STATUS_OPTIONS = optionsFrom(PROJECT_STATUS_LABEL);
const INVOICE_STATUS_OPTIONS = optionsFrom(INVOICE_STATUS_LABEL);

export function RevenueRow({
  entry,
  figures,
  disabled,
  canDelete,
  onEdit,
  onConfirm,
  onDelete,
}: RevenueRowProps) {
  const isDraft = entry.status === EntryStatus.DRAFT;
  return (
    <TableRow className={isDraft ? 'bg-amber-50/60 dark:bg-amber-950/20' : undefined}>
      <TableCell className="min-w-44">
        <div className="font-medium">{entry.clientName}</div>
        <div className="text-muted-foreground flex items-center gap-1 text-xs">
          {entry.projectName ?? entry.description ?? '—'}
          {isDraft ? <Badge variant="outline">Draft</Badge> : null}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{entry.platformName ?? '—'}</TableCell>
      <TableCell>
        <InlineTextCell
          numeric
          label="Gross"
          value={entry.gross ?? ''}
          pattern={MONEY_INPUT_PATTERN}
          disabled={disabled}
          onCommit={(gross) => onEdit({ gross })}
        />
      </TableCell>
      <TableCell>
        <InlineTextCell
          numeric
          label="Fee %"
          value={entry.feePercent}
          pattern={PERCENT_INPUT_PATTERN}
          disabled={disabled}
          className="w-20 min-w-16"
          onCommit={(feePercent) => onEdit({ feePercent })}
        />
      </TableCell>
      <TableCell className="text-right">
        <Money value={figures.fee} />
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
        <InlineSelectCell
          label="Project status"
          value={entry.projectStatus}
          options={PROJECT_STATUS_OPTIONS}
          disabled={disabled}
          onCommit={(projectStatus) => onEdit({ projectStatus })}
        />
      </TableCell>
      <TableCell>
        <InlineSelectCell
          label="Invoice status"
          value={entry.invoiceStatus}
          options={INVOICE_STATUS_OPTIONS}
          disabled={disabled}
          onCommit={(invoiceStatus) => onEdit({ invoiceStatus })}
        />
      </TableCell>
      <TableCell>
        <InlineTextCell
          label="Referred by"
          value={entry.referredBy ?? ''}
          disabled={disabled}
          className="min-w-28"
          onCommit={(referredBy) => onEdit({ referredBy })}
        />
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          {isDraft ? (
            <Button
              size="icon-sm"
              variant="outline"
              aria-label="Confirm entry"
              disabled={disabled}
              onClick={onConfirm}
            >
              <Check />
            </Button>
          ) : null}
          {canDelete ? (
            <ConfirmActionButton
              title={MESSAGES.COMMON.CONFIRM_DELETE_TITLE}
              description={MESSAGES.COMMON.CONFIRM_DELETE_BODY}
              confirmLabel={MESSAGES.COMMON.DELETE}
              onConfirm={onDelete}
              trigger={
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Delete entry"
                  disabled={disabled}
                >
                  <Trash2 />
                </Button>
              }
            />
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}
