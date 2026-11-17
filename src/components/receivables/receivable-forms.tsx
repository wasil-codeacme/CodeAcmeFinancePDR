'use client';

import { FormProvider, useWatch } from 'react-hook-form';
import type { z } from 'zod';

import {
  CheckboxField,
  NumberTextField,
  SelectField,
  TextField,
} from '@/components/shared/form-fields';
import { SubmitButton } from '@/components/shared/submit-button';
import { AdjustmentKind } from '@/generated/prisma/enums';
import { useActionForm } from '@/hooks/use-action-form';
import { Decimal } from '@/lib/decimal';
import { ADJUSTMENT_KIND_LABEL, optionsFrom } from '@/lib/labels';
import { MESSAGES } from '@/lib/messages';
import { MONEY_DECIMALS } from '@/lib/constants';
import {
  adjustReceivable,
  moveExpectedDate,
  recordReceipt,
  releaseEscrow,
} from '@/server/actions/books.actions';
import {
  adjustReceivableSchema,
  moveExpectedDateSchema,
  recordReceiptSchema,
  releaseEscrowSchema,
} from '@/server/validators/revenue.schema';

export type AccountOption = { value: string; label: string };

function toMoneyInput(value: string): string {
  return new Decimal(value).toFixed(MONEY_DECIMALS, Decimal.ROUND_DOWN);
}

type RecordReceiptFormProps = {
  revenueEntryId: string;
  outstanding: string;
  accounts: AccountOption[];
  today: string;
  onDone: () => void;
};

function EscrowAwareAccountField({ accounts }: { accounts: AccountOption[] }) {
  const isEscrow = useWatch<z.input<typeof recordReceiptSchema>, 'isEscrow'>({ name: 'isEscrow' });
  if (isEscrow) return null;
  return (
    <SelectField
      name="accountId"
      label="Received into"
      placeholder="Pick an account"
      options={accounts}
    />
  );
}

/** "Mark received": the full amount by default; change it for a partial payment. */
export function RecordReceiptForm({
  revenueEntryId,
  outstanding,
  accounts,
  today,
  onDone,
}: RecordReceiptFormProps) {
  const { form, submit, isPending } = useActionForm({
    schema: recordReceiptSchema,
    defaultValues: {
      revenueEntryId,
      receivedOn: today,
      amount: toMoneyInput(outstanding),
      accountId: '',
      isEscrow: false,
    },
    action: recordReceipt,
    successMessage: MESSAGES.RECEIVABLE.RECEIVED,
    onSuccess: onDone,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberTextField name="amount" label="Amount" hint="Lower it for a partial payment." />
          <TextField name="receivedOn" label="Date" type="date" />
        </div>
        <EscrowAwareAccountField accounts={accounts} />
        <CheckboxField
          name="isEscrow"
          label="Funded into escrow, not received yet"
          hint="Counts as safe (funded escrow) but stays outstanding until released."
        />
        <SubmitButton isPending={isPending}>Record</SubmitButton>
      </form>
    </FormProvider>
  );
}

type ReleaseEscrowFormProps = {
  receiptId: string;
  accounts: AccountOption[];
  today: string;
  onDone: () => void;
};

export function ReleaseEscrowForm({ receiptId, accounts, today, onDone }: ReleaseEscrowFormProps) {
  const { form, submit, isPending } = useActionForm({
    schema: releaseEscrowSchema,
    defaultValues: { receiptId, receivedOn: today, accountId: '' },
    action: releaseEscrow,
    successMessage: MESSAGES.RECEIVABLE.ESCROW_RELEASED,
    onSuccess: onDone,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <TextField name="receivedOn" label="Released on" type="date" />
        <SelectField
          name="accountId"
          label="Received into"
          placeholder="Pick an account"
          options={accounts}
        />
        <SubmitButton isPending={isPending}>Mark released</SubmitButton>
      </form>
    </FormProvider>
  );
}

function ReductionAmountField() {
  const kind = useWatch<z.input<typeof adjustReceivableSchema>, 'kind'>({ name: 'kind' });
  if (kind === AdjustmentKind.WRITE_OFF) {
    return (
      <p className="text-muted-foreground text-sm">
        The whole outstanding amount will be written off.
      </p>
    );
  }
  return <NumberTextField name="amount" label="Reduce by" />;
}

type AdjustFormProps = { revenueEntryId: string; today: string; onDone: () => void };

/** Money that will not arrive: reduce the receivable or write it off, always with a reason. */
export function AdjustReceivableForm({ revenueEntryId, today, onDone }: AdjustFormProps) {
  const { form, submit, isPending } = useActionForm({
    schema: adjustReceivableSchema,
    defaultValues: {
      revenueEntryId,
      kind: AdjustmentKind.REDUCTION,
      amount: '',
      adjustedOn: today,
      reason: '',
    },
    action: (values) =>
      adjustReceivable({
        ...values,
        amount: values.kind === AdjustmentKind.WRITE_OFF ? undefined : values.amount,
      }),
    successMessage: MESSAGES.RECEIVABLE.ADJUSTED,
    onSuccess: onDone,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <SelectField name="kind" label="Type" options={optionsFrom(ADJUSTMENT_KIND_LABEL)} />
        <ReductionAmountField />
        <TextField name="adjustedOn" label="Date" type="date" />
        <TextField name="reason" label="Reason" hint="Kept in the audit log." />
        <p className="text-muted-foreground text-xs">
          This lowers net revenue, and so profit, in the month the work was booked.
        </p>
        <SubmitButton isPending={isPending}>Save</SubmitButton>
      </form>
    </FormProvider>
  );
}

type ExpectedDateFormProps = { revenueEntryId: string; expectedDate: string; onDone: () => void };

export function ExpectedDateForm({ revenueEntryId, expectedDate, onDone }: ExpectedDateFormProps) {
  const { form, submit, isPending } = useActionForm({
    schema: moveExpectedDateSchema,
    defaultValues: { revenueEntryId, expectedDate },
    action: moveExpectedDate,
    successMessage: MESSAGES.RECEIVABLE.EXPECTED_DATE_MOVED,
    onSuccess: onDone,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <TextField name="expectedDate" label="Expected on" type="date" />
        <SubmitButton isPending={isPending}>{MESSAGES.COMMON.SAVE}</SubmitButton>
      </form>
    </FormProvider>
  );
}
