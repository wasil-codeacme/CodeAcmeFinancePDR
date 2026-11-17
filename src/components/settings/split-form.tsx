'use client';

import { FormProvider, useWatch } from 'react-hook-form';
import type { z } from 'zod';

import { NumberTextField, TextField } from '@/components/shared/form-fields';
import { SectionCard } from '@/components/shared/section-card';
import { SubmitButton } from '@/components/shared/submit-button';
import { useActionForm } from '@/hooks/use-action-form';
import { FULL_SPLIT_PERCENT } from '@/lib/constants';
import { Decimal, sumDecimals } from '@/lib/decimal';
import { formatPercentValue } from '@/lib/format';
import { MESSAGES } from '@/lib/messages';
import { type MonthKey, formatMonthLabel } from '@/lib/month';
import { cn } from '@/lib/utils';
import { saveSplitVersion } from '@/server/actions/settings.actions';
import type {
  PartnerRecord,
  SplitVersionRecord,
} from '@/server/repositories/profit-sharing.repository';
import { splitVersionSchema } from '@/server/validators/settings.schema';

const DECIMAL_INPUT = /^\d+(\.\d+)?$/;

function SplitTotal() {
  const shares = useWatch<z.input<typeof splitVersionSchema>, 'shares'>({ name: 'shares' });
  const values = shares.map((share) =>
    DECIMAL_INPUT.test(share.splitPercent) ? share.splitPercent : '0',
  );
  const total = sumDecimals(values.map((value) => new Decimal(value)));
  const isComplete = total.equals(FULL_SPLIT_PERCENT);
  return (
    <p
      className={cn(
        'text-sm tabular-nums',
        isComplete ? 'text-muted-foreground' : 'text-destructive',
      )}
    >
      Total {formatPercentValue(total)} {isComplete ? '' : '— must be 100%'}
    </p>
  );
}

type SplitFormProps = {
  partners: PartnerRecord[];
  versions: SplitVersionRecord[];
  defaultMonth: MonthKey;
};

/** PRD §5.5: splits total 100% and apply from a month the founder picks. */
export function SplitForm({ partners, versions, defaultMonth }: SplitFormProps) {
  const activePartners = partners.filter((partner) => partner.active);
  const latest = versions[0];
  const { form, submit, isPending } = useActionForm({
    schema: splitVersionSchema,
    defaultValues: {
      effectiveFrom: defaultMonth,
      shares: activePartners.map((partner) => ({
        partnerId: partner.id,
        splitPercent:
          latest?.shares.find((share) => share.partnerId === partner.id)?.splitPercent ?? '',
      })),
    },
    action: saveSplitVersion,
    successMessage: MESSAGES.SETTINGS.VERSION_SAVED,
  });

  if (activePartners.length === 0) {
    return (
      <SectionCard title="Profit split">
        <p className="text-muted-foreground text-sm">{MESSAGES.SETTINGS.SPLIT_NEEDS_PARTNERS}</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Profit split" description="Each partner's share of distributable profit.">
      <FormProvider {...form}>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {activePartners.map((partner, index) => (
              <NumberTextField
                key={partner.id}
                name={`shares.${index}.splitPercent`}
                label={`${partner.name} (%)`}
              />
            ))}
          </div>
          <SplitTotal />
          <TextField
            name="effectiveFrom"
            label="Applies from month"
            type="month"
            className="max-w-48"
          />
          <div>
            <SubmitButton isPending={isPending}>Save split</SubmitButton>
          </div>
        </form>
      </FormProvider>
      {versions.length > 0 ? (
        <ul className="text-muted-foreground mt-4 grid gap-1 border-t pt-3 text-xs">
          {versions.map((version) => (
            <li key={version.id}>
              From {formatMonthLabel(version.effectiveFrom)}:{' '}
              {version.shares
                .map((share) => `${share.partnerName} ${formatPercentValue(share.splitPercent)}`)
                .join(' · ')}
            </li>
          ))}
        </ul>
      ) : null}
    </SectionCard>
  );
}
