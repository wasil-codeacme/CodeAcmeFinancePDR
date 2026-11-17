'use client';

import { Pencil, Plus } from 'lucide-react';
import { FormProvider, useWatch } from 'react-hook-form';
import type { z } from 'zod';

import { type ExpenseFormOptions, SalesChannelField } from '@/components/expenses/expense-form';
import {
  CheckboxField,
  MonthField,
  NumberTextField,
  SelectField,
  TextField,
  TextareaField,
} from '@/components/shared/form-fields';
import { EmptyState } from '@/components/shared/empty-state';
import { FormDialog } from '@/components/shared/form-dialog';
import { Money } from '@/components/shared/money';
import { SubmitButton } from '@/components/shared/submit-button';
import { Badge } from '@/components/ui/badge';
import { IconButton } from '@/components/shared/icon-button';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Frequency, FundingSource } from '@/generated/prisma/enums';
import { useActionForm } from '@/hooks/use-action-form';
import { FREQUENCY_LABEL, FUNDING_SOURCE_LABEL, optionsFrom } from '@/lib/labels';
import { MESSAGES } from '@/lib/messages';
import { type MonthKey, formatMonthLabel } from '@/lib/month';
import { createRecurringTemplate, updateRecurringTemplate } from '@/server/actions/expense.actions';
import { recurringTemplateSchema } from '@/server/validators/expense.schema';
import type { RecurringTemplateRecord } from '@/types/expense';

type TemplateValues = z.input<typeof recurringTemplateSchema>;

function FundingPartnerField({ partners }: { partners: ExpenseFormOptions['partners'] }) {
  const fundingSource = useWatch<TemplateValues, 'fundingSource'>({ name: 'fundingSource' });
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

function TemplateFields({ options }: { options: ExpenseFormOptions }) {
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
        <TextField name="item" label="Item or vendor" />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <NumberTextField name="amount" label="Amount" />
        <SelectField name="currency" label="Currency" options={currencyOptions} />
      </div>
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
      <SalesChannelField salesCategoryIds={options.salesCategoryIds} />
      <div className="grid gap-3 sm:grid-cols-3">
        <SelectField name="frequency" label="Repeats" options={optionsFrom(FREQUENCY_LABEL)} />
        <MonthField name="startMonth" label="From" />
        <MonthField name="endMonth" label="Until (optional)" />
      </div>
      <TextareaField name="notes" label="Notes" />
      <CheckboxField name="active" label="Active" />
    </>
  );
}

function toFormValues(
  template: RecurringTemplateRecord | null,
  startMonth: MonthKey,
  displayCurrency: string,
): TemplateValues {
  return {
    categoryId: template?.categoryId ?? '',
    item: template?.item ?? '',
    payeeTeamMemberId: template?.payeeTeamMemberId ?? '',
    amount: template?.amount ?? '',
    currency: template?.currency ?? displayCurrency,
    fundingSource: template?.fundingSource ?? FundingSource.COMPANY,
    fundingPartnerId: template?.fundingPartnerId ?? '',
    paidFromAccountId: template?.paidFromAccountId ?? '',
    salesChannel: template?.salesChannel ?? '',
    notes: template?.notes ?? '',
    frequency: template?.frequency ?? Frequency.MONTHLY,
    dayOfMonth: template?.dayOfMonth ?? 1,
    startMonth: template?.startMonth ?? startMonth,
    endMonth: template?.endMonth ?? null,
    active: template?.active ?? true,
  };
}

type TemplateFormProps = {
  template: RecurringTemplateRecord | null;
  options: ExpenseFormOptions;
  startMonth: MonthKey;
  onDone: () => void;
};

function TemplateForm({ template, options, startMonth, onDone }: TemplateFormProps) {
  const { form, submit, isPending } = useActionForm({
    schema: recurringTemplateSchema,
    defaultValues: toFormValues(template, startMonth, options.currencies.display),
    action: (values) =>
      template
        ? updateRecurringTemplate({ id: template.id, template: values })
        : createRecurringTemplate(values),
    successMessage: template ? MESSAGES.TEMPLATE.UPDATED : MESSAGES.TEMPLATE.CREATED,
    onSuccess: onDone,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <TemplateFields options={options} />
        <SubmitButton isPending={isPending}>
          {template ? MESSAGES.COMMON.SAVE : MESSAGES.COMMON.ADD}
        </SubmitButton>
      </form>
    </FormProvider>
  );
}

type RecurringTemplatesProps = {
  templates: RecurringTemplateRecord[];
  options: ExpenseFormOptions;
  startMonth: MonthKey;
};

export function AddTemplateButton({
  options,
  startMonth,
}: Omit<RecurringTemplatesProps, 'templates'>) {
  return (
    <FormDialog
      title="Add recurring expense"
      trigger={
        <Button>
          <Plus /> Add recurring
        </Button>
      }
    >
      {(close) => (
        <TemplateForm template={null} options={options} startMonth={startMonth} onDone={close} />
      )}
    </FormDialog>
  );
}

export function RecurringTemplatesTable({
  templates,
  options,
  startMonth,
}: RecurringTemplatesProps) {
  if (templates.length === 0) {
    return (
      <EmptyState
        title="No recurring expenses"
        description="Add salaries and subscriptions once; each month gets a draft to confirm."
      />
    );
  }
  return (
    <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="hidden md:table-cell">Category</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="hidden lg:table-cell">Repeats</TableHead>
            <TableHead className="hidden lg:table-cell">Funding</TableHead>
            <TableHead className="sr-only">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((template) => (
            <TableRow key={template.id} className={template.active ? undefined : 'opacity-60'}>
              <TableCell className="font-medium">
                {template.item}{' '}
                {!template.active ? <Badge variant="secondary">Stopped</Badge> : null}
              </TableCell>
              <TableCell className="hidden md:table-cell">{template.categoryName}</TableCell>
              <TableCell className="text-right">
                <Money value={template.amount} currency={template.currency} />
              </TableCell>
              <TableCell className="hidden whitespace-nowrap lg:table-cell">
                {FREQUENCY_LABEL[template.frequency]} from {formatMonthLabel(template.startMonth)}
                {template.endMonth ? ` to ${formatMonthLabel(template.endMonth)}` : ''}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {FUNDING_SOURCE_LABEL[template.fundingSource]}
              </TableCell>
              <TableCell className="text-right">
                <FormDialog
                  title="Edit recurring expense"
                  trigger={
                    <IconButton size="icon-sm" variant="ghost" label={`Edit ${template.item}`}>
                      <Pencil />
                    </IconButton>
                  }
                >
                  {(close) => (
                    <TemplateForm
                      template={template}
                      options={options}
                      startMonth={startMonth}
                      onDone={close}
                    />
                  )}
                </FormDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
