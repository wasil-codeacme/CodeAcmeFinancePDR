'use client';

import { ArrowRightLeft, Trash2 } from 'lucide-react';
import { FormProvider } from 'react-hook-form';

import { ConfirmActionButton } from '@/components/shared/confirm-action-button';
import {
  DateField,
  NumberTextField,
  SelectField,
  TextField,
} from '@/components/shared/form-fields';
import { FormDialog } from '@/components/shared/form-dialog';
import { IconButton } from '@/components/shared/icon-button';
import { Money } from '@/components/shared/money';
import { SectionCard } from '@/components/shared/section-card';
import { SubmitButton } from '@/components/shared/submit-button';
import { Button } from '@/components/ui/button';
import { useActionForm } from '@/hooks/use-action-form';
import { useOptimisticList } from '@/hooks/use-optimistic-list';
import { MESSAGES } from '@/lib/messages';
import { formatDateLabel } from '@/lib/month';
import { createTransfer, deleteTransfer } from '@/server/actions/account.actions';
import type { TransferRecord } from '@/server/repositories/account-balance.repository';
import { transferSchema } from '@/server/validators/account.schema';

type Option = { value: string; label: string };

type TransferFormProps = {
  accounts: Option[];
  categories: Option[];
  defaultDate: string;
  onDone: () => void;
};

function TransferForm({ accounts, categories, defaultDate, onDone }: TransferFormProps) {
  const { form, submit, isPending } = useActionForm({
    schema: transferSchema,
    defaultValues: {
      fromAccountId: '',
      toAccountId: '',
      transferredOn: defaultDate,
      amount: '',
      receivedAmount: '',
      fee: '',
      feeCategoryId: '',
      note: '',
    },
    action: createTransfer,
    successMessage: MESSAGES.ACCOUNT.TRANSFER_RECORDED,
    onSuccess: onDone,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            name="fromAccountId"
            label="From"
            placeholder="Pick an account"
            options={accounts}
          />
          <SelectField
            name="toAccountId"
            label="To"
            placeholder="Pick an account"
            options={accounts}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberTextField name="amount" label="Amount sent" />
          <DateField name="transferredOn" label="Date" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberTextField name="fee" label="Fee (optional)" hint="Booked as a company expense." />
          <SelectField
            name="feeCategoryId"
            label="Fee category"
            options={categories}
            emptyLabel="None"
          />
        </div>
        <NumberTextField
          name="receivedAmount"
          label="Amount received (optional)"
          hint="Needed when the two accounts use different currencies; otherwise sent − fee."
        />
        <TextField name="note" label="Note" />
        <SubmitButton isPending={isPending}>Record transfer</SubmitButton>
      </form>
    </FormProvider>
  );
}

type TransfersPanelProps = Omit<TransferFormProps, 'onDone'> & {
  transfers: TransferRecord[];
  readOnly: boolean;
  canDelete: boolean;
};

/** Moving money between accounts is neither revenue nor expense (PRD §4). */
export function TransfersPanel({
  transfers,
  readOnly,
  canDelete,
  ...formProps
}: TransfersPanelProps) {
  const { rows: optimisticTransfers, mutate } = useOptimisticList(transfers);
  return (
    <SectionCard
      title="Transfers"
      description="Money moved between your own accounts this month."
      action={
        readOnly ? null : (
          <FormDialog
            title="Record a transfer"
            trigger={
              <Button size="sm" variant="outline">
                <ArrowRightLeft /> Transfer
              </Button>
            }
          >
            {(close) => <TransferForm {...formProps} onDone={close} />}
          </FormDialog>
        )
      }
    >
      {optimisticTransfers.length === 0 ? (
        <p className="text-muted-foreground text-sm">No transfers this month.</p>
      ) : (
        <ul className="divide-y">
          {optimisticTransfers.map((transfer) => (
            <li key={transfer.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">
                  {transfer.fromAccountName} → {transfer.toAccountName}
                </div>
                <div className="text-muted-foreground text-xs">
                  {formatDateLabel(transfer.transferredOn)}
                  {transfer.fee !== '0' ? ` · fee ${transfer.fee}` : ''}
                  {transfer.note ? ` · ${transfer.note}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Money value={transfer.amount} />
                {canDelete && !readOnly ? (
                  <ConfirmActionButton
                    title="Delete this transfer?"
                    description="Its fee expense is removed too. The audit log keeps a copy."
                    confirmLabel={MESSAGES.COMMON.DELETE}
                    onConfirm={() =>
                      mutate(
                        { type: 'remove', id: transfer.id },
                        () => deleteTransfer({ id: transfer.id }),
                        MESSAGES.COMMON.DELETED,
                      )
                    }
                    trigger={
                      <IconButton size="icon-sm" variant="ghost" label="Delete transfer">
                        <Trash2 />
                      </IconButton>
                    }
                  />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
