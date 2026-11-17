'use client';

import { Pencil, Plus } from 'lucide-react';
import { FormProvider } from 'react-hook-form';

import { CheckboxField, TextField } from '@/components/shared/form-fields';
import { FormDialog } from '@/components/shared/form-dialog';
import { SectionCard } from '@/components/shared/section-card';
import { SubmitButton } from '@/components/shared/submit-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useActionForm } from '@/hooks/use-action-form';
import { formatPercentValue } from '@/lib/format';
import { MESSAGES } from '@/lib/messages';
import { formatMonthLabel } from '@/lib/month';
import { addPartner, updatePartner } from '@/server/actions/settings.actions';
import type {
  PartnerRecord,
  SplitVersionRecord,
} from '@/server/repositories/profit-sharing.repository';
import { partnerSchema, updatePartnerSchema } from '@/server/validators/settings.schema';

function AddPartnerForm({ onDone }: { onDone: () => void }) {
  const { form, submit, isPending } = useActionForm({
    schema: partnerSchema,
    defaultValues: { name: '' },
    action: addPartner,
    successMessage: MESSAGES.COMMON.SAVED,
    onSuccess: onDone,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <TextField name="name" label="Partner name" autoFocus />
        <SubmitButton isPending={isPending}>{MESSAGES.COMMON.ADD}</SubmitButton>
      </form>
    </FormProvider>
  );
}

function EditPartnerForm({ partner, onDone }: { partner: PartnerRecord; onDone: () => void }) {
  const { form, submit, isPending } = useActionForm({
    schema: updatePartnerSchema,
    defaultValues: partner,
    action: updatePartner,
    successMessage: MESSAGES.COMMON.SAVED,
    onSuccess: onDone,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <TextField name="name" label="Partner name" />
        <CheckboxField
          name="active"
          label="Active"
          hint="Inactive partners are left out of new splits."
        />
        <SubmitButton isPending={isPending}>{MESSAGES.COMMON.SAVE}</SubmitButton>
      </form>
    </FormProvider>
  );
}

type PartnersListProps = { partners: PartnerRecord[]; currentSplit: SplitVersionRecord | null };

export function PartnersList({ partners, currentSplit }: PartnersListProps) {
  return (
    <SectionCard
      title="Partners"
      description="The founders who share profit."
      action={
        <FormDialog
          title="Add partner"
          trigger={
            <Button size="sm" variant="outline">
              <Plus /> Add
            </Button>
          }
        >
          {(close) => <AddPartnerForm onDone={close} />}
        </FormDialog>
      }
    >
      {partners.length === 0 ? (
        <p className="text-muted-foreground text-sm">Add each partner, then set the split below.</p>
      ) : (
        <ul className="divide-y">
          {partners.map((partner) => {
            const share = currentSplit?.shares.find(
              (candidate) => candidate.partnerId === partner.id,
            );
            return (
              <li key={partner.id} className="flex items-center justify-between gap-2 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{partner.name}</span>
                  {!partner.active ? <Badge variant="secondary">Inactive</Badge> : null}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-sm tabular-nums">
                    {share ? formatPercentValue(share.splitPercent) : '—'}
                  </span>
                  <FormDialog
                    title="Edit partner"
                    trigger={
                      <Button size="icon-sm" variant="ghost" aria-label={`Edit ${partner.name}`}>
                        <Pencil />
                      </Button>
                    }
                  >
                    {(close) => <EditPartnerForm partner={partner} onDone={close} />}
                  </FormDialog>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {currentSplit ? (
        <p className="text-muted-foreground mt-3 text-xs">
          Current split effective from {formatMonthLabel(currentSplit.effectiveFrom)}.
        </p>
      ) : null}
    </SectionCard>
  );
}
