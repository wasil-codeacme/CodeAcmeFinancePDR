'use client';

import { FormProvider, useWatch } from 'react-hook-form';
import type { z } from 'zod';

import {
  DateField,
  NumberTextField,
  SelectField,
  TextField,
  TextareaField,
} from '@/components/shared/form-fields';
import { SubmitButton } from '@/components/shared/submit-button';
import { FundingSource } from '@/generated/prisma/enums';
import { useActionForm } from '@/hooks/use-action-form';
import { Decimal } from '@/lib/decimal';
import { formatMoney } from '@/lib/format';
import { FUNDING_SOURCE_LABEL, optionsFrom } from '@/lib/labels';
import { MESSAGES } from '@/lib/messages';
import { createExpense, updateExpense } from '@/server/actions/expense.actions';
import { expenseSchema, updateExpenseSchema } from '@/server/validators/expense.schema';
import type { ExpenseRecord } from '@/types/expense';

const AMOUNT_PATTERN = /^\d+(\.\d+)?$/;

type Option = { value: string; label: string };

export type ExpenseFormOptions = {
  categories: Option[];
  teamMembers: Option[];
  partners: Option[];
  accounts: Option[];
  currencies: { reporting: string; display: string };
  rate: string | null;
};

type ExpenseFormValues = z.input<typeof expenseSchema>;

function ConversionPreview({ currencies, rate }: Pick<ExpenseFormOptions, 'currencies' | 'rate'>) {
  const [amount, currency] = useWatch<ExpenseFormValues, ['amount', 'currency']>({
    name: ['amount', 'currency'],
  });
  if (!rate || !AMOUNT_PATTERN.test(amount)) return null;
  const isDisplay = currency === currencies.display;
  const converted = isDisplay
    ? new Decimal(amount).dividedBy(rate)
    : new Decimal(amount).times(rate);
  return (
    <p className="text-muted-foreground text-xs tabular-nums">
      ≈ {formatMoney(converted)} {isDisplay ? currencies.reporting : currencies.display} at {rate}
    </p>
  );
}

function FundingPartnerField({ partners }: { partners: Option[] }) {
  const fundingSource = useWatch<ExpenseFormValues, 'fundingSource'>({ name: 'fundingSource' });
  if (fundingSource !== FundingSource.EXTERNAL) return null;
  return (
    <SelectField
      name="fundingPartnerId"
      label="Funded by"
      placeholder="Pick a partner"
      options={partners}
    />
  );
}

function ExpenseFields({ options }: { options: ExpenseFormOptions }) {
  const currencyOptions = [options.currencies.display, options.currencies.reporting].map(
    (code) => ({ value: code, label: code }),
  );
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          name="categoryId"
          label="Category"
          placeholder="Pick a category"
          options={options.categories}
        />
        <DateField name="expenseDate" label="Date" hint="Sets which month it counts in." />
        <DateField
          name="paidOn"
          label="Paid on (advance only)"
          hint="Only if the cash left in an earlier month."
        />
      </div>
      <TextField name="item" label="Item or vendor" />
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <NumberTextField name="amount" label="Amount" />
        <SelectField name="currency" label="Currency" options={currencyOptions} />
      </div>
      <ConversionPreview currencies={options.currencies} rate={options.rate} />
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          name="fundingSource"
          label="Funding source"
          options={optionsFrom(FUNDING_SOURCE_LABEL)}
        />
        <FundingPartnerField partners={options.partners} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          name="payeeTeamMemberId"
          label="Payee"
          options={options.teamMembers}
          emptyLabel="None"
        />
        <SelectField
          name="paidFromAccountId"
          label="Paid from"
          options={options.accounts}
          emptyLabel="Not recorded"
        />
      </div>
      <TextareaField name="notes" label="Notes" />
    </>
  );
}

type CreateExpenseFormProps = {
  options: ExpenseFormOptions;
  defaultDate: string;
  onDone: () => void;
};

export function CreateExpenseForm({ options, defaultDate, onDone }: CreateExpenseFormProps) {
  const { form, submit, isPending } = useActionForm({
    schema: expenseSchema,
    defaultValues: {
      expenseDate: defaultDate,
      paidOn: '',
      categoryId: '',
      item: '',
      payeeTeamMemberId: '',
      amount: '',
      currency: options.currencies.display,
      fundingSource: FundingSource.COMPANY,
      fundingPartnerId: '',
      paidFromAccountId: '',
      notes: '',
    },
    action: createExpense,
    successMessage: MESSAGES.EXPENSE.CREATED,
    onSuccess: onDone,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <ExpenseFields options={options} />
        <SubmitButton isPending={isPending}>{MESSAGES.COMMON.ADD}</SubmitButton>
      </form>
    </FormProvider>
  );
}

type EditExpenseFormProps = {
  expense: ExpenseRecord;
  options: ExpenseFormOptions;
  onDone: () => void;
};

export function EditExpenseForm({ expense, options, onDone }: EditExpenseFormProps) {
  const { form, submit, isPending } = useActionForm({
    schema: updateExpenseSchema,
    defaultValues: {
      id: expense.id,
      expenseDate: expense.expenseDate,
      paidOn: expense.paidOn ?? '',
      categoryId: expense.categoryId,
      item: expense.item,
      payeeTeamMemberId: expense.payeeTeamMemberId ?? '',
      amount: expense.amount,
      currency: expense.currency,
      fundingSource: expense.fundingSource,
      fundingPartnerId: expense.fundingPartnerId ?? '',
      paidFromAccountId: expense.paidFromAccountId ?? '',
      notes: expense.notes ?? '',
    },
    action: updateExpense,
    successMessage: MESSAGES.EXPENSE.UPDATED,
    onSuccess: onDone,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <ExpenseFields options={options} />
        <SubmitButton isPending={isPending}>{MESSAGES.COMMON.SAVE}</SubmitButton>
      </form>
    </FormProvider>
  );
}
