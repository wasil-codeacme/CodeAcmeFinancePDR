'use client';

import { Pencil, Plus } from 'lucide-react';
import { FormProvider } from 'react-hook-form';

import {
  CheckboxField,
  MonthField,
  NumberTextField,
  SelectField,
  TextField,
} from '@/components/shared/form-fields';
import { FormDialog } from '@/components/shared/form-dialog';
import { Money } from '@/components/shared/money';
import { SectionCard } from '@/components/shared/section-card';
import { SubmitButton } from '@/components/shared/submit-button';
import { Badge } from '@/components/ui/badge';
import { IconButton } from '@/components/shared/icon-button';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AccountType } from '@/generated/prisma/enums';
import { useActionForm } from '@/hooks/use-action-form';
import { ACCOUNT_TYPE_LABEL, optionsFrom } from '@/lib/labels';
import { MESSAGES } from '@/lib/messages';
import { type MonthKey, formatMonthLabel } from '@/lib/month';
import { createAccount, updateAccount } from '@/server/actions/settings.actions';
import type { AccountRecord } from '@/server/repositories/settings.repository';
import { accountSchema, updateAccountSchema } from '@/server/validators/settings.schema';

function AccountFields() {
  return (
    <>
      <TextField name="name" label="Account name" hint="e.g. Wise, Upwork, Elevate Pay" />
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField name="type" label="Type" options={optionsFrom(ACCOUNT_TYPE_LABEL)} />
        <TextField name="currency" label="Currency" />
      </div>
      <TextField
        name="ownerLabel"
        label="Owner"
        hint="Whose account it is, e.g. Company or a partner's name"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberTextField name="openingBalance" label="Opening balance" />
        <MonthField name="openingBalanceMonth" label="Balance as at start of" />
      </div>
      <CheckboxField name="active" label="Active" />
    </>
  );
}

export function CreateAccountForm({
  defaultMonth,
  currency,
  onDone,
}: {
  defaultMonth: MonthKey;
  currency: string;
  onDone: () => void;
}) {
  const { form, submit, isPending } = useActionForm({
    schema: accountSchema,
    defaultValues: {
      name: '',
      type: AccountType.BANK,
      currency,
      ownerLabel: '',
      openingBalance: '0',
      openingBalanceMonth: defaultMonth,
      active: true,
    },
    action: createAccount,
    successMessage: MESSAGES.COMMON.SAVED,
    onSuccess: onDone,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <AccountFields />
        <SubmitButton isPending={isPending}>{MESSAGES.COMMON.ADD}</SubmitButton>
      </form>
    </FormProvider>
  );
}

export function EditAccountForm({
  account,
  onDone,
}: {
  account: AccountRecord;
  onDone: () => void;
}) {
  const { form, submit, isPending } = useActionForm({
    schema: updateAccountSchema,
    defaultValues: { ...account, ownerLabel: account.ownerLabel ?? '' },
    action: updateAccount,
    successMessage: MESSAGES.COMMON.SAVED,
    onSuccess: onDone,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <AccountFields />
        <SubmitButton isPending={isPending}>{MESSAGES.COMMON.SAVE}</SubmitButton>
      </form>
    </FormProvider>
  );
}

type AccountsSectionProps = {
  accounts: AccountRecord[];
  defaultMonth: MonthKey;
  reportingCurrency: string;
};

export function AccountsSection({
  accounts,
  defaultMonth,
  reportingCurrency,
}: AccountsSectionProps) {
  return (
    <SectionCard
      title="Accounts"
      description="The channels money moves through. Opening balances seed each account's history."
      action={
        <FormDialog
          title="Add account"
          trigger={
            <Button size="sm" variant="outline">
              <Plus /> Add
            </Button>
          }
        >
          {(close) => (
            <CreateAccountForm
              defaultMonth={defaultMonth}
              currency={reportingCurrency}
              onDone={close}
            />
          )}
        </FormDialog>
      }
    >
      {accounts.length === 0 ? (
        <p className="text-muted-foreground text-sm">No accounts yet.</p>
      ) : (
        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="hidden sm:table-cell">Owner</TableHead>
                <TableHead className="text-right">Opening balance</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">
                    {account.name}{' '}
                    {!account.active ? <Badge variant="secondary">Inactive</Badge> : null}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {ACCOUNT_TYPE_LABEL[account.type]}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {account.ownerLabel ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Money value={account.openingBalance} currency={account.currency} />
                    <span className="text-muted-foreground block text-xs">
                      start of {formatMonthLabel(account.openingBalanceMonth)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <FormDialog
                      title="Edit account"
                      trigger={
                        <IconButton size="icon-sm" variant="ghost" label={`Edit ${account.name}`}>
                          <Pencil />
                        </IconButton>
                      }
                    >
                      {(close) => <EditAccountForm account={account} onDone={close} />}
                    </FormDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </SectionCard>
  );
}
