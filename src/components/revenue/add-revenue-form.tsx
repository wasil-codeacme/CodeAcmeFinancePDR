'use client';

import { Plus } from 'lucide-react';
import { FormProvider, useWatch } from 'react-hook-form';
import type { z } from 'zod';

import { MonthField, NumberTextField, SelectField } from '@/components/shared/form-fields';
import { Button } from '@/components/ui/button';
import { ProjectStatus } from '@/generated/prisma/enums';
import { useActionForm } from '@/hooks/use-action-form';
import { PROJECT_STATUS_LABEL, optionsFrom } from '@/lib/labels';
import { MESSAGES } from '@/lib/messages';
import type { MonthKey } from '@/lib/month';
import { createRevenueEntry } from '@/server/actions/books.actions';
import { createRevenueSchema } from '@/server/validators/revenue.schema';

export type ClientOption = {
  id: string;
  name: string;
  projects: { id: string; name: string }[];
};

function ProjectSelect({ clients }: { clients: ClientOption[] }) {
  const clientId = useWatch<z.input<typeof createRevenueSchema>, 'clientId'>({ name: 'clientId' });
  const projects = clients.find((client) => client.id === clientId)?.projects ?? [];
  return (
    <SelectField
      name="projectId"
      label="Project"
      emptyLabel="No specific project"
      options={projects.map((project) => ({ value: project.id, label: project.name }))}
    />
  );
}

/**
 * PRD §5.1: client or project, gross, month and status are all it takes; the platform and
 * fee % come from the project, client or platform defaults and can be edited in the table.
 */
export function AddRevenueForm({ clients, month }: { clients: ClientOption[]; month: MonthKey }) {
  const defaultValues = {
    clientId: '',
    projectId: '',
    gross: '',
    bookingMonth: month,
    projectStatus: ProjectStatus.IN_PROGRESS,
  };
  const { form, submit, isPending } = useActionForm({
    schema: createRevenueSchema,
    defaultValues,
    action: createRevenueEntry,
    successMessage: MESSAGES.REVENUE.CREATED,
    resetOnSuccess: true,
  });
  return (
    <FormProvider {...form}>
      <form
        onSubmit={submit}
        className="bg-card grid gap-3 rounded-xl border p-3 shadow-xs sm:grid-cols-2 lg:grid-cols-[1.4fr_1.4fr_1fr_1fr_1fr_auto] lg:items-end"
      >
        <SelectField
          name="clientId"
          label="Client"
          placeholder="Pick a client"
          options={clients.map((client) => ({ value: client.id, label: client.name }))}
        />
        <ProjectSelect clients={clients} />
        <NumberTextField name="gross" label="Gross amount" />
        <MonthField name="bookingMonth" label="Month" />
        <SelectField
          name="projectStatus"
          label="Status"
          options={optionsFrom(PROJECT_STATUS_LABEL)}
        />
        <Button type="submit" disabled={isPending} className="sm:col-span-2 lg:col-span-1">
          <Plus /> {isPending ? 'Adding…' : 'Add'}
        </Button>
      </form>
    </FormProvider>
  );
}
