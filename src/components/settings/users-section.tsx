'use client';

import { Trash2, UserPlus } from 'lucide-react';
import { FormProvider } from 'react-hook-form';

import { ConfirmActionButton } from '@/components/shared/confirm-action-button';
import { SelectField, TextField } from '@/components/shared/form-fields';
import { FormDialog } from '@/components/shared/form-dialog';
import { SectionCard } from '@/components/shared/section-card';
import { SubmitButton } from '@/components/shared/submit-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type Role, Role as RoleValue } from '@/generated/prisma/enums';
import { useActionForm } from '@/hooks/use-action-form';
import { useActionRunner } from '@/hooks/use-action-runner';
import { ROLE_LABEL, USER_STATUS_LABEL, optionsFrom } from '@/lib/labels';
import { MESSAGES } from '@/lib/messages';
import { changeUserRole, inviteUser, removeUser } from '@/server/actions/user.actions';
import type { UserRecord } from '@/server/repositories/user.repository';
import { inviteUserSchema } from '@/server/validators/user.schema';

function InviteUserForm({ onDone }: { onDone: () => void }) {
  const { form, submit, isPending } = useActionForm({
    schema: inviteUserSchema,
    defaultValues: { email: '', name: '', role: RoleValue.FOUNDER },
    action: inviteUser,
    successMessage: MESSAGES.USER.INVITED,
    onSuccess: onDone,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <TextField name="name" label="Name" autoFocus />
        <TextField name="email" label="Email" type="email" />
        <SelectField name="role" label="Role" options={optionsFrom(ROLE_LABEL)} />
        <SubmitButton isPending={isPending}>Send invite</SubmitButton>
      </form>
    </FormProvider>
  );
}

type UserRow = Pick<UserRecord, 'id' | 'name' | 'email' | 'role' | 'status'>;

export function UsersSection({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const { run, isPending } = useActionRunner();
  return (
    <SectionCard
      title="Users"
      description="Invite-only. People sign in with a one-time code sent to their email."
      action={
        <FormDialog
          title="Invite user"
          trigger={
            <Button size="sm" variant="outline">
              <UserPlus /> Invite
            </Button>
          }
        >
          {(close) => <InviteUserForm onDone={close} />}
        </FormDialog>
      }
    >
      <ul className="divide-y">
        {users.map((user) => (
          <li key={user.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className="grid min-w-0 gap-0.5">
              <span className="truncate text-sm font-medium">
                {user.name} <Badge variant="secondary">{USER_STATUS_LABEL[user.status]}</Badge>
              </span>
              <span className="text-muted-foreground truncate text-xs">{user.email}</span>
            </div>
            <div className="flex items-center gap-1">
              <Select
                value={user.role}
                disabled={isPending || user.id === currentUserId}
                onValueChange={(role: Role) =>
                  run(() => changeUserRole({ userId: user.id, role }), MESSAGES.USER.ROLE_CHANGED)
                }
              >
                <SelectTrigger size="sm" className="w-40" aria-label={`Role for ${user.name}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {optionsFrom(ROLE_LABEL).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {user.id !== currentUserId ? (
                <ConfirmActionButton
                  title={`Remove ${user.name}?`}
                  description="They are signed out everywhere and can no longer sign in. Their past entries stay."
                  confirmLabel="Remove"
                  onConfirm={() =>
                    run(() => removeUser({ userId: user.id }), MESSAGES.USER.REMOVED)
                  }
                  trigger={
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Remove ${user.name}`}
                      disabled={isPending}
                    >
                      <Trash2 />
                    </Button>
                  }
                />
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
