'use client';

import { FormProvider } from 'react-hook-form';

import { CheckboxField, NumberTextField, TextField } from '@/components/shared/form-fields';
import { SectionCard } from '@/components/shared/section-card';
import { SubmitButton } from '@/components/shared/submit-button';
import { useActionForm } from '@/hooks/use-action-form';
import { formatPercentValue } from '@/lib/format';
import { MESSAGES } from '@/lib/messages';
import { type MonthKey, formatMonthLabel } from '@/lib/month';
import { saveReserveRule } from '@/server/actions/settings.actions';
import type { ReserveRuleRecord } from '@/server/repositories/profit-sharing.repository';
import { reserveRuleSchema } from '@/server/validators/settings.schema';

type ReserveRuleFormProps = { rules: ReserveRuleRecord[]; defaultMonth: MonthKey };

export function ReserveRuleForm({ rules, defaultMonth }: ReserveRuleFormProps) {
  const latest = rules[0];
  const { form, submit, isPending } = useActionForm({
    schema: reserveRuleSchema,
    defaultValues: {
      effectiveFrom: defaultMonth,
      enabled: latest?.enabled ?? true,
      reservePercent: latest?.reservePercent ?? '',
      appliesInLossMonth: latest?.appliesInLossMonth ?? false,
    },
    action: saveReserveRule,
    successMessage: MESSAGES.SETTINGS.VERSION_SAVED,
  });
  return (
    <SectionCard
      title="Reserve rule"
      description="Held back from each partner's share and kept in the company, as a % of distributable profit."
    >
      <FormProvider {...form}>
        <form onSubmit={submit} className="grid gap-4">
          <CheckboxField name="enabled" label="Hold back a reserve" />
          <NumberTextField
            name="reservePercent"
            label="Reserve per partner (%)"
            className="max-w-48"
          />
          <CheckboxField
            name="appliesInLossMonth"
            label="Also apply in a loss month"
            hint="When on, a loss month records a negative reserve, as the workbook does."
          />
          <TextField
            name="effectiveFrom"
            label="Applies from month"
            type="month"
            className="max-w-48"
          />
          <div>
            <SubmitButton isPending={isPending}>Save reserve rule</SubmitButton>
          </div>
        </form>
      </FormProvider>
      {rules.length > 0 ? (
        <ul className="text-muted-foreground mt-4 grid gap-1 border-t pt-3 text-xs">
          {rules.map((rule) => (
            <li key={rule.id}>
              From {formatMonthLabel(rule.effectiveFrom)}:{' '}
              {rule.enabled
                ? `${formatPercentValue(rule.reservePercent)} per partner${rule.appliesInLossMonth ? ', also in loss months' : ''}`
                : 'off'}
            </li>
          ))}
        </ul>
      ) : null}
    </SectionCard>
  );
}
