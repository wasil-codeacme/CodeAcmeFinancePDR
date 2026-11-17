'use client';

import { Plus, Trash2 } from 'lucide-react';
import { FormProvider } from 'react-hook-form';

import { ConfirmActionButton } from '@/components/shared/confirm-action-button';
import { NumberTextField, TextField } from '@/components/shared/form-fields';
import { FormDialog } from '@/components/shared/form-dialog';
import { IconButton } from '@/components/shared/icon-button';
import { Money } from '@/components/shared/money';
import { SectionCard } from '@/components/shared/section-card';
import { SubmitButton } from '@/components/shared/submit-button';
import { Button } from '@/components/ui/button';
import { useActionForm } from '@/hooks/use-action-form';
import { useActionRunner } from '@/hooks/use-action-runner';
import { MESSAGES } from '@/lib/messages';
import { type MonthKey, addMonths, formatDateLabel, formatMonthLabel } from '@/lib/month';
import { addNextMonthReserve, deleteNextMonthReserve } from '@/server/actions/period.actions';
import type { NextMonthReserveRecord } from '@/server/repositories/period.repository';
import { nextMonthReserveSchema } from '@/server/validators/period.schema';
import type { ExpenseRecord } from '@/types/expense';

function ReserveForm({ month, onDone }: { month: MonthKey; onDone: () => void }) {
  const { form, submit, isPending } = useActionForm({
    schema: nextMonthReserveSchema,
    defaultValues: { month, amount: '', note: '' },
    action: addNextMonthReserve,
    successMessage: MESSAGES.PERIOD.RESERVE_ADDED,
    onSuccess: onDone,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <NumberTextField name="amount" label="Amount (USD)" />
        <TextField name="note" label="For" hint="e.g. next month's salaries" />
        <SubmitButton isPending={isPending}>{MESSAGES.COMMON.ADD}</SubmitButton>
      </form>
    </FormProvider>
  );
}

type ReservesAndAdvancesProps = {
  month: MonthKey;
  reserves: NextMonthReserveRecord[];
  advances: ExpenseRecord[];
  readOnly: boolean;
};

/**
 * PRD §5.6: next-month reserves and advance expenses replace the hand-typed Closing cells.
 * An advance leaves cash now and counts as an expense in the month it is for.
 */
export function ReservesAndAdvances({
  month,
  reserves,
  advances,
  readOnly,
}: ReservesAndAdvancesProps) {
  const { run, isPending } = useActionRunner();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard
        title={`Reserved for ${formatMonthLabel(addMonths(month, 1))}`}
        description="Cash set aside at close for next month's costs."
        action={
          readOnly ? null : (
            <FormDialog
              title="Reserve for next month"
              trigger={
                <Button size="sm" variant="outline">
                  <Plus /> Add
                </Button>
              }
            >
              {(close) => <ReserveForm month={month} onDone={close} />}
            </FormDialog>
          )
        }
      >
        {reserves.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing reserved.</p>
        ) : (
          <ul className="divide-y text-sm">
            {reserves.map((reserve) => (
              <li key={reserve.id} className="flex items-center justify-between gap-2 py-1.5">
                <span className="truncate">{reserve.note ?? 'Reserve'}</span>
                <span className="flex items-center gap-1">
                  <Money value={reserve.amount} />
                  {readOnly ? null : (
                    <ConfirmActionButton
                      title="Remove this reserve?"
                      description="It is removed from next month's reserved cash."
                      confirmLabel={MESSAGES.COMMON.DELETE}
                      onConfirm={() =>
                        run(
                          () => deleteNextMonthReserve({ id: reserve.id }),
                          MESSAGES.COMMON.DELETED,
                        )
                      }
                      trigger={
                        <IconButton
                          size="icon-sm"
                          variant="ghost"
                          label="Remove reserve"
                          disabled={isPending}
                        >
                          <Trash2 />
                        </IconButton>
                      }
                    />
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      <SectionCard
        title="Advance expenses paid this month"
        description="Paid now, counted in the month they are for. Add one from Expenses with an earlier “paid on” date."
      >
        {advances.length === 0 ? (
          <p className="text-muted-foreground text-sm">No advances paid this month.</p>
        ) : (
          <ul className="divide-y text-sm">
            {advances.map((advance) => (
              <li key={advance.id} className="flex items-center justify-between gap-2 py-1.5">
                <span className="min-w-0 truncate">
                  {advance.item} · for {formatMonthLabel(advance.month)}
                  {advance.paidOn ? ` · paid ${formatDateLabel(advance.paidOn)}` : ''}
                </span>
                <Money value={advance.amount} currency={advance.currency} />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
