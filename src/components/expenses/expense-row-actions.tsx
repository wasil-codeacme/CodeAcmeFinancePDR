'use client';

import { Check, Pencil, Trash2 } from 'lucide-react';

import { ExpenseAttachmentsButton } from '@/components/expenses/expense-attachments';
import { EditExpenseForm, type ExpenseFormOptions } from '@/components/expenses/expense-form';
import { ConfirmActionButton } from '@/components/shared/confirm-action-button';
import { FormDialog } from '@/components/shared/form-dialog';
import { IconButton } from '@/components/shared/icon-button';
import { EntryStatus } from '@/generated/prisma/enums';
import { MESSAGES } from '@/lib/messages';
import { cn } from '@/lib/utils';
import type { ExpenseRecord } from '@/types/expense';

/** Confirm and delete are run by the list that owns the rows, so they show at once. */
export type ExpenseRowCallbacks = {
  onConfirm: (expense: ExpenseRecord) => void;
  onDelete: (expense: ExpenseRecord) => void;
};

type ExpenseRowActionsProps = ExpenseRowCallbacks & {
  expense: ExpenseRecord;
  options: ExpenseFormOptions;
  canDeleteConfirmed: boolean;
  className?: string;
};

export function ExpenseRowActions({
  expense,
  options,
  canDeleteConfirmed,
  className,
  onConfirm,
  onDelete,
}: ExpenseRowActionsProps) {
  const isDraft = expense.status === EntryStatus.DRAFT;
  return (
    <div className={cn('flex justify-end gap-1', className)}>
      {isDraft ? (
        <IconButton
          size="icon-sm"
          variant="outline"
          label="Confirm expense"
          onClick={() => onConfirm(expense)}
        >
          <Check />
        </IconButton>
      ) : null}
      <ExpenseAttachmentsButton expense={expense} />
      <FormDialog
        title="Edit expense"
        trigger={
          <IconButton size="icon-sm" variant="ghost" label="Edit expense">
            <Pencil />
          </IconButton>
        }
      >
        {(close) => <EditExpenseForm expense={expense} options={options} onDone={close} />}
      </FormDialog>
      {isDraft || canDeleteConfirmed ? (
        <ConfirmActionButton
          title={MESSAGES.COMMON.CONFIRM_DELETE_TITLE}
          description={
            isDraft
              ? 'A deleted recurring draft is skipped for this month and will not be generated again.'
              : MESSAGES.COMMON.CONFIRM_DELETE_BODY
          }
          confirmLabel={MESSAGES.COMMON.DELETE}
          onConfirm={() => onDelete(expense)}
          trigger={
            <IconButton size="icon-sm" variant="ghost" label="Delete expense">
              <Trash2 />
            </IconButton>
          }
        />
      ) : null}
    </div>
  );
}
