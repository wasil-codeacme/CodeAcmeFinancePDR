'use client';

import { FormProvider } from 'react-hook-form';

import { NumberTextField, TextField } from '@/components/shared/form-fields';
import { SectionCard } from '@/components/shared/section-card';
import { SubmitButton } from '@/components/shared/submit-button';
import { useActionForm } from '@/hooks/use-action-form';
import { MESSAGES } from '@/lib/messages';
import { type MonthKey, formatMonthLabel } from '@/lib/month';
import { saveExchangeRate } from '@/server/actions/settings.actions';
import type { ExchangeRateRecord } from '@/server/repositories/settings.repository';
import { exchangeRateSchema } from '@/server/validators/settings.schema';

type RatesSectionProps = {
  rates: ExchangeRateRecord[];
  defaultMonth: MonthKey;
  currencies: { reporting: string; display: string } | null;
};

/** PRD §6: one rate per month, used for every conversion in that month. */
export function RatesSection({ rates, defaultMonth, currencies }: RatesSectionProps) {
  const pair = currencies
    ? `${currencies.display} per 1 ${currencies.reporting}`
    : 'display units per reporting unit';
  const { form, submit, isPending } = useActionForm({
    schema: exchangeRateSchema,
    defaultValues: { month: defaultMonth, rate: rates[0]?.rate ?? '' },
    action: saveExchangeRate,
    successMessage: MESSAGES.COMMON.SAVED,
  });
  return (
    <SectionCard
      title="Exchange rates"
      description={`One rate per month (${pair}). A month without its own rate uses the latest earlier one.`}
    >
      <FormProvider {...form}>
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <TextField name="month" label="Month" type="month" className="w-44" />
          <NumberTextField name="rate" label="Rate" className="w-36" />
          <SubmitButton isPending={isPending}>{MESSAGES.COMMON.SAVE}</SubmitButton>
        </form>
      </FormProvider>
      {rates.length > 0 ? (
        <ul className="mt-4 grid gap-1 border-t pt-3 text-sm sm:grid-cols-3">
          {rates.map((rate) => (
            <li key={rate.id} className="flex justify-between gap-4 tabular-nums">
              <span className="text-muted-foreground">{formatMonthLabel(rate.month)}</span>
              <span>{rate.rate}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </SectionCard>
  );
}
