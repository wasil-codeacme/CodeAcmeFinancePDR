'use client';

import { FormProvider } from 'react-hook-form';

import { SelectField, TextField, TextareaField } from '@/components/shared/form-fields';
import { SubmitButton } from '@/components/shared/submit-button';
import { useActionForm } from '@/hooks/use-action-form';
import { MESSAGES } from '@/lib/messages';
import { updateRevenueEntry } from '@/server/actions/books.actions';
import { updateRevenueSchema } from '@/server/validators/revenue.schema';
import type { RevenueEntryRecord } from '@/types/revenue';

export type RevenueOptions = {
  platforms: { value: string; label: string }[];
  teamMembers: { value: string; label: string }[];
};

type RevenueDetailsFormProps = {
  entry: RevenueEntryRecord;
  options: RevenueOptions;
  onDone: () => void;
};

/** The less-used fields, kept out of the table: platform, who closed it (BD commission), notes. */
export function RevenueDetailsForm({ entry, options, onDone }: RevenueDetailsFormProps) {
  const { form, submit, isPending } = useActionForm({
    schema: updateRevenueSchema,
    defaultValues: {
      id: entry.id,
      platformId: entry.platformId ?? '',
      closedByTeamMemberId: entry.closedByTeamMemberId ?? '',
      referredBy: entry.referredBy ?? '',
      notes: entry.notes ?? '',
    },
    action: updateRevenueEntry,
    successMessage: MESSAGES.REVENUE.UPDATED,
    onSuccess: onDone,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            name="platformId"
            label="Platform"
            options={options.platforms}
            emptyLabel="None"
          />
          <SelectField
            name="closedByTeamMemberId"
            label="Closed by"
            hint="Earns the BD commission, if set up."
            options={options.teamMembers}
            emptyLabel="Nobody"
          />
        </div>
        <TextField name="referredBy" label="Referred by" />
        <TextareaField name="notes" label="Notes" />
        <SubmitButton isPending={isPending}>{MESSAGES.COMMON.SAVE}</SubmitButton>
      </form>
    </FormProvider>
  );
}
