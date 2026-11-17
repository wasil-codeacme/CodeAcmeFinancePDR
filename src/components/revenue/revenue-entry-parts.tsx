'use client';

import { Check, Pencil, Trash2 } from 'lucide-react';

import { InlineSelectCell, InlineTextCell } from '@/components/revenue/inline-cells';
import { type RevenueOptions, RevenueDetailsForm } from '@/components/revenue/revenue-details-form';
import { ConfirmActionButton } from '@/components/shared/confirm-action-button';
import { FormDialog } from '@/components/shared/form-dialog';
import { IconButton } from '@/components/shared/icon-button';
import { Money } from '@/components/shared/money';
import { Badge } from '@/components/ui/badge';
import { EntryStatus, type InvoiceStatus, type ProjectStatus } from '@/generated/prisma/enums';
import { MONEY_INPUT_PATTERN, PERCENT_INPUT_PATTERN } from '@/lib/input-patterns';
import { INVOICE_STATUS_LABEL, PROJECT_STATUS_LABEL, optionsFrom } from '@/lib/labels';
import { MESSAGES } from '@/lib/messages';
import type { RevenueLineFigures } from '@/server/domain/revenue-math';
import type { RevenueEntryRecord } from '@/types/revenue';

export type RevenueEdit = Partial<{
  gross: string;
  feePercent: string;
  projectStatus: ProjectStatus;
  invoiceStatus: InvoiceStatus;
}>;

/** Everything a row or card needs to show and edit one revenue entry. */
export type RevenueEntryViewProps = {
  entry: RevenueEntryRecord;
  figures: RevenueLineFigures;
  options: RevenueOptions;
  disabled: boolean;
  canDelete: boolean;
  onEdit: (changes: RevenueEdit) => void;
  onConfirm: () => void;
  onDelete: () => void;
};

const PROJECT_STATUS_OPTIONS = optionsFrom(PROJECT_STATUS_LABEL);
const INVOICE_STATUS_OPTIONS = optionsFrom(INVOICE_STATUS_LABEL);

export function ClientSummary({ entry }: Pick<RevenueEntryViewProps, 'entry'>) {
  const subtitle = [entry.projectName ?? entry.description, entry.platformName].filter(Boolean);
  return (
    <div className="min-w-0">
      <div className="truncate font-medium">{entry.clientName}</div>
      <div className="text-muted-foreground flex items-center gap-1 text-xs">
        <span className="truncate">{subtitle.length ? subtitle.join(' · ') : '—'}</span>
        {entry.status === EntryStatus.DRAFT ? <Badge variant="outline">Draft</Badge> : null}
      </div>
    </div>
  );
}

export function GrossInput({
  entry,
  disabled,
  onEdit,
}: Pick<RevenueEntryViewProps, 'entry' | 'disabled' | 'onEdit'>) {
  return (
    <InlineTextCell
      numeric
      label="Gross"
      value={entry.gross ?? ''}
      pattern={MONEY_INPUT_PATTERN}
      disabled={disabled}
      className="w-24 min-w-0"
      onCommit={(gross) => onEdit({ gross })}
    />
  );
}

/** Fee % is editable; the resulting fee sits beside it on the same line. */
export function FeeInput({
  entry,
  figures,
  disabled,
  onEdit,
}: Pick<RevenueEntryViewProps, 'entry' | 'figures' | 'disabled' | 'onEdit'>) {
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="relative">
        <InlineTextCell
          numeric
          label="Fee %"
          value={entry.feePercent}
          pattern={PERCENT_INPUT_PATTERN}
          disabled={disabled}
          className="w-16 min-w-0 pr-6"
          onCommit={(feePercent) => onEdit({ feePercent })}
        />
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs">
          %
        </span>
      </div>
      <Money value={figures.fee} className="text-muted-foreground w-16 text-right" />
    </div>
  );
}

export function StatusControls({
  entry,
  disabled,
  onEdit,
}: Pick<RevenueEntryViewProps, 'entry' | 'disabled' | 'onEdit'>) {
  return (
    <div className="grid gap-1">
      <InlineSelectCell
        label="Project status"
        value={entry.projectStatus}
        options={PROJECT_STATUS_OPTIONS}
        disabled={disabled}
        onCommit={(projectStatus) => onEdit({ projectStatus })}
      />
      <InlineSelectCell
        label="Invoice status"
        value={entry.invoiceStatus}
        options={INVOICE_STATUS_OPTIONS}
        disabled={disabled}
        onCommit={(invoiceStatus) => onEdit({ invoiceStatus })}
      />
    </div>
  );
}

export function EntryActions(props: RevenueEntryViewProps) {
  const { entry, options, disabled, canDelete, onConfirm, onDelete } = props;
  return (
    <div className="flex justify-end gap-0.5">
      {entry.status === EntryStatus.DRAFT ? (
        <IconButton
          size="icon-sm"
          variant="outline"
          label="Confirm entry"
          disabled={disabled}
          onClick={onConfirm}
        >
          <Check />
        </IconButton>
      ) : null}
      <FormDialog
        title={`${entry.clientName} — details`}
        trigger={
          <IconButton size="icon-sm" variant="ghost" label="Details: platform, closed by, notes">
            <Pencil />
          </IconButton>
        }
      >
        {(close) => <RevenueDetailsForm entry={entry} options={options} onDone={close} />}
      </FormDialog>
      {canDelete ? (
        <ConfirmActionButton
          title={MESSAGES.COMMON.CONFIRM_DELETE_TITLE}
          description={MESSAGES.COMMON.CONFIRM_DELETE_BODY}
          confirmLabel={MESSAGES.COMMON.DELETE}
          onConfirm={onDelete}
          trigger={
            <IconButton size="icon-sm" variant="ghost" label="Delete entry" disabled={disabled}>
              <Trash2 />
            </IconButton>
          }
        />
      ) : null}
    </div>
  );
}
