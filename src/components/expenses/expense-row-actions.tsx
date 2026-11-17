'use client';

import { Check, Pencil, Trash2 } from 'lucide-react';

import { ExpenseAttachmentsButton } from '@/components/expenses/expense-attachments';
import { EditExpenseForm, type ExpenseFormOptions } from '@/components/expenses/expense-form';
import { ConfirmActionButton } from '@/components/shared/confirm-action-button';
import { FormDialog } from '@/components/shared/form-dialog';
import { IconButton } from '@/components/shared/icon-button';
import { EntryStatus } from '@/generated/prisma/enums';
import { useActionRunner } from '@/hooks/use-action-runner';
import { MESSAGES } from '@/lib/messages';
import { cn } from '@/lib/utils';
import { confirmExpense, deleteExpense } from '@/server/actions/expense.actions';
import type { ExpenseRecord } from '@/types/expense';

type ExpenseRowActionsProps = {
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
}: ExpenseRowActionsProps) {
  const { run, isPending } = useActionRunner();
  const isDraft = expense.status === EntryStatus.DRAFT;
  return (
    <div className={cn('flex justify-end gap-1', className)}>
      {isDraft ? (
        <IconButton
          size="icon-sm"
          variant="outline"
          label="Confirm expense"
          disabled={isPending}
          onClick={() => run(() => confirmExpense({ id: expense.id }), MESSAGES.EXPENSE.CONFIRMED)}
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
          onConfirm={() => run(() => deleteExpense({ id: expense.id }), MESSAGES.COMMON.DELETED)}
          trigger={
            <IconButton size="icon-sm" variant="ghost" label="Delete expense" disabled={isPending}>
              <Trash2 />
            </IconButton>
          }
        />
      ) : null}
    </div>
  );
}
