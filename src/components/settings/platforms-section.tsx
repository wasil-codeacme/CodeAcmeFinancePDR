'use client';

import { Pencil, Percent, Plus } from 'lucide-react';
import { FormProvider } from 'react-hook-form';

import {
  CheckboxField,
  MonthField,
  NumberTextField,
  TextField,
} from '@/components/shared/form-fields';
import { FormDialog } from '@/components/shared/form-dialog';
import { SectionCard } from '@/components/shared/section-card';
import { SubmitButton } from '@/components/shared/submit-button';
import { Badge } from '@/components/ui/badge';
import { IconButton } from '@/components/shared/icon-button';
import { Button } from '@/components/ui/button';
import { useActionForm } from '@/hooks/use-action-form';
import { formatPercentValue } from '@/lib/format';
import { MESSAGES } from '@/lib/messages';
import { type MonthKey, formatMonthLabel } from '@/lib/month';
import { createPlatform, setPlatformFee, updatePlatform } from '@/server/actions/settings.actions';
import type { PlatformRecord } from '@/server/repositories/platform.repository';
import {
  platformFeeSchema,
  platformSchema,
  updatePlatformSchema,
} from '@/server/validators/settings.schema';

function CreatePlatformForm({
  defaultMonth,
  onDone,
}: {
  defaultMonth: MonthKey;
  onDone: () => void;
}) {
  const { form, submit, isPending } = useActionForm({
    schema: platformSchema,
    defaultValues: { name: '', feePercent: '', effectiveFrom: defaultMonth },
    action: createPlatform,
    successMessage: MESSAGES.COMMON.SAVED,
    onSuccess: onDone,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <TextField name="name" label="Platform name" hint="e.g. Upwork, Direct" autoFocus />
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberTextField name="feePercent" label="Default fee (%)" />
          <MonthField name="effectiveFrom" label="Applies from month" />
        </div>
        <SubmitButton isPending={isPending}>{MESSAGES.COMMON.ADD}</SubmitButton>
      </form>
    </FormProvider>
  );
}

function EditPlatformForm({ platform, onDone }: { platform: PlatformRecord; onDone: () => void }) {
  const { form, submit, isPending } = useActionForm({
    schema: updatePlatformSchema,
    defaultValues: { id: platform.id, name: platform.name, active: platform.active },
    action: updatePlatform,
    successMessage: MESSAGES.COMMON.SAVED,
    onSuccess: onDone,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <TextField name="name" label="Platform name" />
        <CheckboxField name="active" label="Active" />
        <SubmitButton isPending={isPending}>{MESSAGES.COMMON.SAVE}</SubmitButton>
      </form>
    </FormProvider>
  );
}

function ChangeFeeForm({
  platformId,
  defaultMonth,
  onDone,
}: {
  platformId: string;
  defaultMonth: MonthKey;
  onDone: () => void;
}) {
  const { form, submit, isPending } = useActionForm({
    schema: platformFeeSchema,
    defaultValues: { platformId, feePercent: '', effectiveFrom: defaultMonth },
    action: setPlatformFee,
    successMessage: MESSAGES.SETTINGS.VERSION_SAVED,
    onSuccess: onDone,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <p className="text-muted-foreground text-sm">
          Entries already booked keep the fee they were saved with.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberTextField name="feePercent" label="New default fee (%)" autoFocus />
          <MonthField name="effectiveFrom" label="Applies from month" />
        </div>
        <SubmitButton isPending={isPending}>{MESSAGES.COMMON.SAVE}</SubmitButton>
      </form>
    </FormProvider>
  );
}

export function PlatformsSection({
  platforms,
  defaultMonth,
}: {
  platforms: PlatformRecord[];
  defaultMonth: MonthKey;
}) {
  return (
    <SectionCard
      title="Platforms"
      description="Where work is sold, with the fee each one takes by default."
      action={
        <FormDialog
          title="Add platform"
          trigger={
            <Button size="sm" variant="outline">
              <Plus /> Add
            </Button>
          }
        >
          {(close) => <CreatePlatformForm defaultMonth={defaultMonth} onDone={close} />}
        </FormDialog>
      }
    >
      {platforms.length === 0 ? (
        <p className="text-muted-foreground text-sm">No platforms yet.</p>
      ) : (
        <ul className="divide-y">
          {platforms.map((platform) => (
            <li
              key={platform.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2"
            >
              <div className="grid gap-0.5">
                <span className="text-sm font-medium">
                  {platform.name}{' '}
                  {!platform.active ? <Badge variant="secondary">Inactive</Badge> : null}
                </span>
                <span className="text-muted-foreground text-xs">
                  {platform.feeVersions
                    .map(
                      (version) =>
                        `${formatPercentValue(version.feePercent)} from ${formatMonthLabel(version.effectiveFrom)}`,
                    )
                    .join(' · ')}
                </span>
              </div>
              <div className="flex gap-1">
                <FormDialog
                  title={`Change ${platform.name} fee`}
                  trigger={
                    <Button size="sm" variant="ghost">
                      <Percent /> Fee
                    </Button>
                  }
                >
                  {(close) => (
                    <ChangeFeeForm
                      platformId={platform.id}
                      defaultMonth={defaultMonth}
                      onDone={close}
                    />
                  )}
                </FormDialog>
                <FormDialog
                  title="Edit platform"
                  trigger={
                    <IconButton size="icon-sm" variant="ghost" label={`Edit ${platform.name}`}>
                      <Pencil />
                    </IconButton>
                  }
                >
                  {(close) => <EditPlatformForm platform={platform} onDone={close} />}
                </FormDialog>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
