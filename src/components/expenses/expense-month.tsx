'use client';

import { DraftsPanel } from '@/components/expenses/drafts-panel';
import { ExpenseGroups } from '@/components/expenses/expense-groups';
import type { ExpenseFormOptions } from '@/components/expenses/expense-form';
import { Money } from '@/components/shared/money';
import { Card, CardContent } from '@/components/ui/card';
import { EntryStatus } from '@/generated/prisma/enums';
import { useOptimisticList } from '@/hooks/use-optimistic-list';
import { MESSAGES } from '@/lib/messages';
import type { MonthKey } from '@/lib/month';
import { confirmExpense, deleteExpense } from '@/server/actions/expense.actions';
import { groupExpenseMonth } from '@/server/domain/expense-view';
import type { ExpenseCategoryMeta, ExpenseRecord, ExpenseRow } from '@/types/expense';

type ExpenseMonthProps = {
  rows: ExpenseRow[];
  categories: ExpenseCategoryMeta[];
  month: MonthKey;
  options: ExpenseFormOptions;
  canDeleteConfirmed: boolean;
  rateNote: string | null;
};

function TotalCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card size="sm">
      <CardContent className="grid gap-1">
        <span className="text-muted-foreground text-xs">{label}</span>
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * The month's totals, drafts and category groups from one list of lines. Confirming or
 * deleting changes the screen at once (a confirmed draft moves into its group and the totals
 * follow), and the server catches up in the background.
 */
export function ExpenseMonth({
  rows,
  categories,
  month,
  options,
  canDeleteConfirmed,
  rateNote,
}: ExpenseMonthProps) {
  const { rows: optimisticRows, mutate } = useOptimisticList(rows);
  const lists = groupExpenseMonth(optimisticRows, categories);
  const { reporting } = options.currencies;
  const callbacks = {
    onConfirm: (expense: ExpenseRecord) =>
      mutate(
        { type: 'update', id: expense.id, patch: { status: EntryStatus.CONFIRMED } },
        () => confirmExpense({ id: expense.id }),
        MESSAGES.EXPENSE.CONFIRMED,
      ),
    onDelete: (expense: ExpenseRecord) =>
      mutate(
        { type: 'remove', id: expense.id },
        () => deleteExpense({ id: expense.id }),
        MESSAGES.COMMON.DELETED,
      ),
  };
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <TotalCard label={`Company expense (${reporting})`}>
          <Money value={lists.companyTotal} className="text-base font-semibold" />
        </TotalCard>
        <TotalCard label={`Externally funded (${reporting})`}>
          <Money value={lists.externalTotal} className="text-base font-semibold" />
        </TotalCard>
        <TotalCard label="Exchange rate">
          <span className="font-figures text-base font-semibold">{rateNote ?? '—'}</span>
        </TotalCard>
      </div>
      <DraftsPanel drafts={lists.drafts} month={month} options={options} {...callbacks} />
      <ExpenseGroups
        groups={lists.groups}
        options={options}
        canDeleteConfirmed={canDeleteConfirmed}
        {...callbacks}
      />
    </>
  );
}
