'use client';

import { FormProvider } from 'react-hook-form';

import { NumberTextField, SelectField, TextField } from '@/components/shared/form-fields';
import { SectionCard } from '@/components/shared/section-card';
import { SubmitButton } from '@/components/shared/submit-button';
import { CommissionBase } from '@/generated/prisma/enums';
import { useActionForm } from '@/hooks/use-action-form';
import { formatPercentValue } from '@/lib/format';
import { COMMISSION_BASE_LABEL, optionsFrom } from '@/lib/labels';
import { MESSAGES } from '@/lib/messages';
import { type MonthKey, formatMonthLabel } from '@/lib/month';
import { saveCommissionRule } from '@/server/actions/settings.actions';
import type { CommissionRuleRecord } from '@/server/repositories/settings.repository';
import { commissionRuleSchema } from '@/server/validators/settings.schema';

type CommissionFormProps = {
  rules: CommissionRuleRecord[];
  earners: string[];
  defaultMonth: MonthKey;
};

export function CommissionForm({ rules, earners, defaultMonth }: CommissionFormProps) {
  const latest = rules[0];
  const { form, submit, isPending } = useActionForm({
    schema: commissionRuleSchema,
    defaultValues: {
      effectiveFrom: defaultMonth,
      ratePercent: latest?.ratePercent ?? '',
      base: latest?.base ?? CommissionBase.NET_REVENUE,
    },
    action: saveCommissionRule,
    successMessage: MESSAGES.SETTINGS.VERSION_SAVED,
  });
  return (
    <SectionCard
      title="BD commission"
      description="Paid to the BD person on the projects they closed, as a company sales expense."
    >
      <FormProvider {...form}>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberTextField name="ratePercent" label="Commission rate (%)" />
            <SelectField
              name="base"
              label="Applies to"
              options={optionsFrom(COMMISSION_BASE_LABEL)}
            />
          </div>
          <TextField
            name="effectiveFrom"
            label="Applies from month"
            type="month"
            className="max-w-48"
          />
          <div>
            <SubmitButton isPending={isPending}>Save commission</SubmitButton>
          </div>
        </form>
      </FormProvider>
      <p className="text-muted-foreground mt-4 border-t pt-3 text-xs">
        Earned by:{' '}
        {earners.length > 0
          ? earners.join(', ')
          : 'nobody yet — tick “Earns BD commission” on a team member.'}
      </p>
      {rules.length > 0 ? (
        <ul className="text-muted-foreground mt-2 grid gap-1 text-xs">
          {rules.map((rule) => (
            <li key={rule.id}>
              From {formatMonthLabel(rule.effectiveFrom)}: {formatPercentValue(rule.ratePercent)} of{' '}
              {COMMISSION_BASE_LABEL[rule.base].toLowerCase()}
            </li>
          ))}
        </ul>
      ) : null}
    </SectionCard>
  );
}
