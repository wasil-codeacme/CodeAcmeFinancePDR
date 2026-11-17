'use client';

import { FormProvider } from 'react-hook-form';

import { TextField } from '@/components/shared/form-fields';
import { SubmitButton } from '@/components/shared/submit-button';
import { useActionForm } from '@/hooks/use-action-form';
import { MESSAGES } from '@/lib/messages';
import { saveCompany } from '@/server/actions/settings.actions';
import { companySchema } from '@/server/validators/settings.schema';

type CompanyFormProps = {
  company: { name: string; reportingCurrency: string; displayCurrency: string } | null;
};

const SUGGESTED_REPORTING_CURRENCY = 'USD';
const SUGGESTED_DISPLAY_CURRENCY = 'PKR';

export function CompanyForm({ company }: CompanyFormProps) {
  const { form, submit, isPending } = useActionForm({
    schema: companySchema,
    defaultValues: company ?? {
      name: '',
      reportingCurrency: SUGGESTED_REPORTING_CURRENCY,
      displayCurrency: SUGGESTED_DISPLAY_CURRENCY,
    },
    action: saveCompany,
    successMessage: MESSAGES.COMMON.SAVED,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid max-w-md gap-4">
        <TextField name="name" label="Company name" autoComplete="organization" />
        <div className="grid grid-cols-2 gap-3">
          <TextField name="reportingCurrency" label="Reporting currency" hint="All P&L figures" />
          <TextField name="displayCurrency" label="Display currency" hint="Shown alongside" />
        </div>
        <div>
          <SubmitButton isPending={isPending}>{MESSAGES.COMMON.SAVE}</SubmitButton>
        </div>
      </form>
    </FormProvider>
  );
}
