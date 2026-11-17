'use client';

import { FormProvider } from 'react-hook-form';

import {
  CheckboxField,
  NumberTextField,
  SelectField,
  TextField,
} from '@/components/shared/form-fields';
import { SubmitButton } from '@/components/shared/submit-button';
import { ProjectStatus } from '@/generated/prisma/enums';
import { useActionForm } from '@/hooks/use-action-form';
import { PROJECT_STATUS_LABEL, optionsFrom } from '@/lib/labels';
import { MESSAGES } from '@/lib/messages';
import {
  createClient,
  createProject,
  updateClient,
  updateProject,
} from '@/server/actions/books.actions';
import type { ClientRecord, ProjectRecord } from '@/server/repositories/client.repository';
import {
  clientSchema,
  projectSchema,
  updateClientSchema,
  updateProjectSchema,
} from '@/server/validators/client.schema';

type PlatformOption = { value: string; label: string };

function ClientFields({ platforms }: { platforms: PlatformOption[] }) {
  return (
    <>
      <TextField name="name" label="Client name" autoFocus />
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          name="defaultPlatformId"
          label="Default platform"
          options={platforms}
          emptyLabel="None"
        />
        <NumberTextField
          name="defaultFeePercent"
          label="Fee % override"
          hint="Blank = platform default"
        />
      </div>
      <CheckboxField name="active" label="Active" />
    </>
  );
}

export function CreateClientForm({
  platforms,
  onDone,
}: {
  platforms: PlatformOption[];
  onDone: () => void;
}) {
  const { form, submit, isPending } = useActionForm({
    schema: clientSchema,
    defaultValues: { name: '', defaultPlatformId: '', defaultFeePercent: '', active: true },
    action: createClient,
    successMessage: MESSAGES.COMMON.SAVED,
    onSuccess: onDone,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <ClientFields platforms={platforms} />
        <SubmitButton isPending={isPending}>{MESSAGES.COMMON.ADD}</SubmitButton>
      </form>
    </FormProvider>
  );
}

type EditClientFormProps = {
  client: ClientRecord;
  platforms: PlatformOption[];
  onDone: () => void;
};

export function EditClientForm({ client, platforms, onDone }: EditClientFormProps) {
  const { form, submit, isPending } = useActionForm({
    schema: updateClientSchema,
    defaultValues: {
      id: client.id,
      name: client.name,
      defaultPlatformId: client.defaultPlatformId ?? '',
      defaultFeePercent: client.defaultFeePercent ?? '',
      active: client.active,
    },
    action: updateClient,
    successMessage: MESSAGES.COMMON.SAVED,
    onSuccess: onDone,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <ClientFields platforms={platforms} />
        <SubmitButton isPending={isPending}>{MESSAGES.COMMON.SAVE}</SubmitButton>
      </form>
    </FormProvider>
  );
}

function ProjectFields({ platforms }: { platforms: PlatformOption[] }) {
  return (
    <>
      <TextField name="name" label="Project name" autoFocus />
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          name="platformId"
          label="Platform"
          options={platforms}
          emptyLabel="Client default"
        />
        <NumberTextField
          name="feePercentOverride"
          label="Fee % override"
          hint="Blank = client/platform default"
        />
      </div>
      <SelectField name="status" label="Status" options={optionsFrom(PROJECT_STATUS_LABEL)} />
      <CheckboxField name="active" label="Active" />
    </>
  );
}

type CreateProjectFormProps = { clientId: string; platforms: PlatformOption[]; onDone: () => void };

export function CreateProjectForm({ clientId, platforms, onDone }: CreateProjectFormProps) {
  const { form, submit, isPending } = useActionForm({
    schema: projectSchema,
    defaultValues: {
      clientId,
      name: '',
      platformId: '',
      feePercentOverride: '',
      status: ProjectStatus.IN_PROGRESS,
      active: true,
    },
    action: createProject,
    successMessage: MESSAGES.COMMON.SAVED,
    onSuccess: onDone,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <ProjectFields platforms={platforms} />
        <SubmitButton isPending={isPending}>{MESSAGES.COMMON.ADD}</SubmitButton>
      </form>
    </FormProvider>
  );
}

type EditProjectFormProps = {
  project: ProjectRecord;
  platforms: PlatformOption[];
  onDone: () => void;
};

export function EditProjectForm({ project, platforms, onDone }: EditProjectFormProps) {
  const { form, submit, isPending } = useActionForm({
    schema: updateProjectSchema,
    defaultValues: {
      ...project,
      platformId: project.platformId ?? '',
      feePercentOverride: project.feePercentOverride ?? '',
    },
    action: updateProject,
    successMessage: MESSAGES.COMMON.SAVED,
    onSuccess: onDone,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <ProjectFields platforms={platforms} />
        <SubmitButton isPending={isPending}>{MESSAGES.COMMON.SAVE}</SubmitButton>
      </form>
    </FormProvider>
  );
}
