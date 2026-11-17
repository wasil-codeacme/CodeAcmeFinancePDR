'use client';

import { ArrowDown, ArrowUp, Pencil, Plus } from 'lucide-react';
import { FormProvider } from 'react-hook-form';

import { CheckboxField, SelectField, TextField } from '@/components/shared/form-fields';
import { FormDialog } from '@/components/shared/form-dialog';
import { SectionCard } from '@/components/shared/section-card';
import { SubmitButton } from '@/components/shared/submit-button';
import { Badge } from '@/components/ui/badge';
import { IconButton } from '@/components/shared/icon-button';
import { Button } from '@/components/ui/button';
import { PnlLine } from '@/generated/prisma/enums';
import { useActionForm } from '@/hooks/use-action-form';
import { useActionRunner } from '@/hooks/use-action-runner';
import { PNL_LINE_LABEL, optionsFrom } from '@/lib/labels';
import { MESSAGES } from '@/lib/messages';
import {
  createExpenseCategory,
  moveExpenseCategory,
  updateExpenseCategory,
} from '@/server/actions/settings.actions';
import type { ExpenseCategoryRecord } from '@/server/repositories/settings.repository';
import {
  expenseCategorySchema,
  updateExpenseCategorySchema,
} from '@/server/validators/settings.schema';

function CategoryFields() {
  return (
    <>
      <TextField name="name" label="Category name" autoFocus />
      <SelectField
        name="pnlLine"
        label="P&L line"
        hint="Where this category's total appears in the P&L."
        options={optionsFrom(PNL_LINE_LABEL)}
      />
      <CheckboxField name="active" label="Active" />
    </>
  );
}

function CreateCategoryForm({ onDone }: { onDone: () => void }) {
  const { form, submit, isPending } = useActionForm({
    schema: expenseCategorySchema,
    defaultValues: { name: '', pnlLine: PnlLine.OPERATIONS_OVERHEAD, active: true },
    action: createExpenseCategory,
    successMessage: MESSAGES.COMMON.SAVED,
    onSuccess: onDone,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <CategoryFields />
        <SubmitButton isPending={isPending}>{MESSAGES.COMMON.ADD}</SubmitButton>
      </form>
    </FormProvider>
  );
}

function EditCategoryForm({
  category,
  onDone,
}: {
  category: ExpenseCategoryRecord;
  onDone: () => void;
}) {
  const { form, submit, isPending } = useActionForm({
    schema: updateExpenseCategorySchema,
    defaultValues: {
      id: category.id,
      name: category.name,
      pnlLine: category.pnlLine,
      active: category.active,
    },
    action: updateExpenseCategory,
    successMessage: MESSAGES.COMMON.SAVED,
    onSuccess: onDone,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <CategoryFields />
        <SubmitButton isPending={isPending}>{MESSAGES.COMMON.SAVE}</SubmitButton>
      </form>
    </FormProvider>
  );
}

export function CategoriesSection({ categories }: { categories: ExpenseCategoryRecord[] }) {
  const { run, isPending } = useActionRunner();
  const move = (id: string, direction: 'UP' | 'DOWN') =>
    run(() => moveExpenseCategory({ id, direction }), MESSAGES.COMMON.SAVED);
  return (
    <SectionCard
      title="Expense categories"
      description="In the order they appear on the expenses page and the P&L."
      action={
        <FormDialog
          title="Add category"
          trigger={
            <Button size="sm" variant="outline">
              <Plus /> Add
            </Button>
          }
        >
          {(close) => <CreateCategoryForm onDone={close} />}
        </FormDialog>
      }
    >
      {categories.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No categories yet. The workbook uses Operations Overhead, Operations Salaries, Management
          Salaries &amp; Overhead, Sales Salaries and Sales Overheads.
        </p>
      ) : (
        <ul className="divide-y">
          {categories.map((category, index) => (
            <li key={category.id} className="flex items-center justify-between gap-2 py-2">
              <div className="grid gap-0.5">
                <span className="text-sm font-medium">
                  {category.name}{' '}
                  {!category.active ? <Badge variant="secondary">Inactive</Badge> : null}
                </span>
                <span className="text-muted-foreground text-xs">
                  {PNL_LINE_LABEL[category.pnlLine]}
                </span>
              </div>
              <div className="flex gap-1">
                <IconButton
                  size="icon-sm"
                  variant="ghost"
                  label="Move up"
                  disabled={isPending || index === 0}
                  onClick={() => move(category.id, 'UP')}
                >
                  <ArrowUp />
                </IconButton>
                <IconButton
                  size="icon-sm"
                  variant="ghost"
                  label="Move down"
                  disabled={isPending || index === categories.length - 1}
                  onClick={() => move(category.id, 'DOWN')}
                >
                  <ArrowDown />
                </IconButton>
                <FormDialog
                  title="Edit category"
                  trigger={
                    <IconButton size="icon-sm" variant="ghost" label={`Edit ${category.name}`}>
                      <Pencil />
                    </IconButton>
                  }
                >
                  {(close) => <EditCategoryForm category={category} onDone={close} />}
                </FormDialog>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
