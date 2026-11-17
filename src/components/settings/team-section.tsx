'use client';

import { Pencil, Plus } from 'lucide-react';
import { FormProvider } from 'react-hook-form';

import { CheckboxField, SelectField, TextField } from '@/components/shared/form-fields';
import { FormDialog } from '@/components/shared/form-dialog';
import { SectionCard } from '@/components/shared/section-card';
import { SubmitButton } from '@/components/shared/submit-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TeamMemberType } from '@/generated/prisma/enums';
import { useActionForm } from '@/hooks/use-action-form';
import { TEAM_MEMBER_TYPE_LABEL, optionsFrom } from '@/lib/labels';
import { MESSAGES } from '@/lib/messages';
import { createTeamMember, updateTeamMember } from '@/server/actions/settings.actions';
import type {
  ExpenseCategoryRecord,
  TeamMemberRecord,
} from '@/server/repositories/settings.repository';
import { teamMemberSchema, updateTeamMemberSchema } from '@/server/validators/settings.schema';

type CategoryOption = { value: string; label: string };

function TeamMemberFields({ categoryOptions }: { categoryOptions: CategoryOption[] }) {
  return (
    <>
      <TextField name="name" label="Name" autoFocus />
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField name="type" label="Type" options={optionsFrom(TEAM_MEMBER_TYPE_LABEL)} />
        <SelectField
          name="defaultCategoryId"
          label="Default expense category"
          options={categoryOptions}
          emptyLabel="None"
        />
      </div>
      <CheckboxField name="earnsCommission" label="Earns BD commission" />
      <CheckboxField name="active" label="Active" />
    </>
  );
}

function CreateTeamMemberForm({
  categoryOptions,
  onDone,
}: {
  categoryOptions: CategoryOption[];
  onDone: () => void;
}) {
  const { form, submit, isPending } = useActionForm({
    schema: teamMemberSchema,
    defaultValues: {
      name: '',
      type: TeamMemberType.EMPLOYEE,
      defaultCategoryId: '',
      earnsCommission: false,
      active: true,
    },
    action: createTeamMember,
    successMessage: MESSAGES.COMMON.SAVED,
    onSuccess: onDone,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <TeamMemberFields categoryOptions={categoryOptions} />
        <SubmitButton isPending={isPending}>{MESSAGES.COMMON.ADD}</SubmitButton>
      </form>
    </FormProvider>
  );
}

type EditTeamMemberFormProps = {
  member: TeamMemberRecord;
  categoryOptions: CategoryOption[];
  onDone: () => void;
};

function EditTeamMemberForm({ member, categoryOptions, onDone }: EditTeamMemberFormProps) {
  const { form, submit, isPending } = useActionForm({
    schema: updateTeamMemberSchema,
    defaultValues: { ...member, defaultCategoryId: member.defaultCategoryId ?? '' },
    action: updateTeamMember,
    successMessage: MESSAGES.COMMON.SAVED,
    onSuccess: onDone,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <TeamMemberFields categoryOptions={categoryOptions} />
        <SubmitButton isPending={isPending}>{MESSAGES.COMMON.SAVE}</SubmitButton>
      </form>
    </FormProvider>
  );
}

type TeamSectionProps = { members: TeamMemberRecord[]; categories: ExpenseCategoryRecord[] };

export function TeamSection({ members, categories }: TeamSectionProps) {
  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }));
  const categoryName = (id: string | null) =>
    categories.find((category) => category.id === id)?.name;
  return (
    <SectionCard
      title="Team members"
      description="Used as expense payees and as “closed by” on revenue."
      action={
        <FormDialog
          title="Add team member"
          trigger={
            <Button size="sm" variant="outline">
              <Plus /> Add
            </Button>
          }
        >
          {(close) => <CreateTeamMemberForm categoryOptions={categoryOptions} onDone={close} />}
        </FormDialog>
      }
    >
      {members.length === 0 ? (
        <p className="text-muted-foreground text-sm">No team members yet. This step is optional.</p>
      ) : (
        <ul className="divide-y">
          {members.map((member) => (
            <li key={member.id} className="flex items-center justify-between gap-2 py-2">
              <div className="grid gap-0.5">
                <span className="text-sm font-medium">
                  {member.name}{' '}
                  {!member.active ? <Badge variant="secondary">Inactive</Badge> : null}
                  {member.earnsCommission ? <Badge variant="outline">BD commission</Badge> : null}
                </span>
                <span className="text-muted-foreground text-xs">
                  {TEAM_MEMBER_TYPE_LABEL[member.type]}
                  {categoryName(member.defaultCategoryId)
                    ? ` · ${categoryName(member.defaultCategoryId)}`
                    : ''}
                </span>
              </div>
              <FormDialog
                title="Edit team member"
                trigger={
                  <Button size="icon-sm" variant="ghost" aria-label={`Edit ${member.name}`}>
                    <Pencil />
                  </Button>
                }
              >
                {(close) => (
                  <EditTeamMemberForm
                    member={member}
                    categoryOptions={categoryOptions}
                    onDone={close}
                  />
                )}
              </FormDialog>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
