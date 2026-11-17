'use client';

import { Check, Pencil, Trash2 } from 'lucide-react';

import { EditExpenseForm, type ExpenseFormOptions } from '@/components/expenses/expense-form';
import { ConfirmActionButton } from '@/components/shared/confirm-action-button';
import { FormDialog } from '@/components/shared/form-dialog';
import { Button } from '@/components/ui/button';
import { EntryStatus } from '@/generated/prisma/enums';
import { useActionRunner } from '@/hooks/use-action-runner';
import { MESSAGES } from '@/lib/messages';
import { confirmExpense, deleteExpense } from '@/server/actions/expense.actions';
import type { ExpenseRecord } from '@/types/expense';

type ExpenseRowActionsProps = {
  expense: ExpenseRecord;
  options: ExpenseFormOptions;
  canDeleteConfirmed: boolean;
};

export function ExpenseRowActions({
  expense,
  options,
  canDeleteConfirmed,
}: ExpenseRowActionsProps) {
  const { run, isPending } = useActionRunner();
  const isDraft = expense.status === EntryStatus.DRAFT;
  return (
    <div className="flex justify-end gap-1">
      {isDraft ? (
        <Button
          size="icon-sm"
          variant="outline"
          aria-label="Confirm expense"
          disabled={isPending}
          onClick={() => run(() => confirmExpense({ id: expense.id }), MESSAGES.EXPENSE.CONFIRMED)}
        >
          <Check />
        </Button>
      ) : null}
      <FormDialog
        title="Edit expense"
        trigger={
          <Button size="icon-sm" variant="ghost" aria-label="Edit expense">
            <Pencil />
          </Button>
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
            <Button size="icon-sm" variant="ghost" aria-label="Delete expense" disabled={isPending}>
              <Trash2 />
            </Button>
          }
        />
      ) : null}
    </div>
  );
}
