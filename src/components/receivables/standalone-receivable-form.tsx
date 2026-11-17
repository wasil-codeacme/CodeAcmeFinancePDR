'use client';

import { Plus } from 'lucide-react';
import { FormProvider } from 'react-hook-form';

import { NumberTextField, SelectField, TextField } from '@/components/shared/form-fields';
import { FormDialog } from '@/components/shared/form-dialog';
import { SubmitButton } from '@/components/shared/submit-button';
import { Button } from '@/components/ui/button';
import { useActionForm } from '@/hooks/use-action-form';
import { MESSAGES } from '@/lib/messages';
import type { MonthKey } from '@/lib/month';
import { createStandaloneReceivable } from '@/server/actions/books.actions';
import { standaloneReceivableSchema } from '@/server/validators/revenue.schema';

type ClientOption = { value: string; label: string };

type StandaloneFormProps = {
  clients: ClientOption[];
  month: MonthKey;
  today: string;
  onDone: () => void;
};

function StandaloneReceivableForm({ clients, month, today, onDone }: StandaloneFormProps) {
  const { form, submit, isPending } = useActionForm({
    schema: standaloneReceivableSchema,
    defaultValues: {
      clientId: '',
      description: '',
      amount: '',
      bookingMonth: month,
      expectedDate: today,
    },
    action: createStandaloneReceivable,
    successMessage: MESSAGES.RECEIVABLE.STANDALONE_CREATED,
    onSuccess: onDone,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <SelectField name="clientId" label="From" placeholder="Pick a client" options={clients} />
        <TextField name="description" label="What it is for" />
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberTextField name="amount" label="Amount" />
          <TextField name="bookingMonth" label="Recorded in" type="month" />
          <TextField name="expectedDate" label="Expected on" type="date" />
        </div>
        <SubmitButton isPending={isPending}>{MESSAGES.COMMON.ADD}</SubmitButton>
      </form>
    </FormProvider>
  );
}

/** For money expected that is not booked revenue; to book work, add revenue instead. */
export function AddStandaloneReceivableButton(props: Omit<StandaloneFormProps, 'onDone'>) {
  return (
    <FormDialog
      title="Add a receivable"
      description="For money you expect that is not revenue booked in the app (for example owed from before you started using it). It is tracked and collected here but never counted in the P&L."
      trigger={
        <Button variant="outline">
          <Plus /> Add receivable
        </Button>
      }
    >
      {(close) => <StandaloneReceivableForm {...props} onDone={close} />}
    </FormDialog>
  );
}
