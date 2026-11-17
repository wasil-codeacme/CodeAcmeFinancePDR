'use client';

import { CheckCheck, Plus, Repeat } from 'lucide-react';
import Link from 'next/link';

import { CreateExpenseForm, type ExpenseFormOptions } from '@/components/expenses/expense-form';
import { FormDialog } from '@/components/shared/form-dialog';
import { Button } from '@/components/ui/button';
import { useActionRunner } from '@/hooks/use-action-runner';
import type { MonthKey } from '@/lib/month';
import { ROUTES } from '@/lib/routes';
import { confirmAllExpenseDrafts, generateRecurringDrafts } from '@/server/actions/expense.actions';

function countMessage(singular: string, plural: string) {
  return (count: number) => `${count} ${count === 1 ? singular : plural}.`;
}

type ExpenseToolbarProps = { month: MonthKey; defaultDate: string; options: ExpenseFormOptions };

export function AddExpenseButton({ defaultDate, options }: Omit<ExpenseToolbarProps, 'month'>) {
  return (
    <FormDialog
      title="Add expense"
      trigger={
        <Button>
          <Plus /> Add expense
        </Button>
      }
    >
      {(close) => <CreateExpenseForm options={options} defaultDate={defaultDate} onDone={close} />}
    </FormDialog>
  );
}

export function GenerateDraftsButton({ month }: { month: MonthKey }) {
  const { run, isPending } = useActionRunner();
  return (
    <Button
      variant="outline"
      disabled={isPending}
      onClick={() =>
        run(
          () => generateRecurringDrafts({ month }),
          countMessage('recurring draft created', 'recurring drafts created'),
        )
      }
    >
      <Repeat /> Generate recurring
    </Button>
  );
}

export function ConfirmAllDraftsButton({ month }: { month: MonthKey }) {
  const { run, isPending } = useActionRunner();
  return (
    <Button
      size="sm"
      disabled={isPending}
      onClick={() =>
        run(
          () => confirmAllExpenseDrafts({ month }),
          countMessage('expense confirmed', 'expenses confirmed'),
        )
      }
    >
      <CheckCheck /> Confirm all
    </Button>
  );
}

export function ManageRecurringLink() {
  return (
    <Button asChild variant="ghost">
      <Link href={ROUTES.RECURRING_TEMPLATES} prefetch>
        Manage recurring
      </Link>
    </Button>
  );
}
