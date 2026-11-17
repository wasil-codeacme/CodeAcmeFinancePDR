'use client';

import { ArrowDownToLine, ArrowUpFromLine, Trash2 } from 'lucide-react';
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
import { SubmitButton } from '@/components/shared/submit-button';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LedgerEntryType } from '@/generated/prisma/enums';
import { useActionForm } from '@/hooks/use-action-form';
import { useActionRunner } from '@/hooks/use-action-runner';
import { MESSAGES } from '@/lib/messages';
import { formatDateLabel, formatMonthLabel } from '@/lib/month';
import {
  deleteLedgerEntry,
  recordFunding,
  recordWithdrawal,
} from '@/server/actions/ledger.actions';
import { ledgerMovementSchema } from '@/server/validators/ledger.schema';
import type { PartnerLedgerView } from '@/types/ledger';

type Option = { value: string; label: string };

type MovementFormProps = {
  partnerId: string;
  kind: 'withdrawal' | 'funding';
  accounts: Option[];
  today: string;
  onDone: () => void;
};

function MovementForm({ partnerId, kind, accounts, today, onDone }: MovementFormProps) {
  const isWithdrawal = kind === 'withdrawal';
  const { form, submit, isPending } = useActionForm({
    schema: ledgerMovementSchema,
    defaultValues: { partnerId, occurredOn: today, amount: '', accountId: '', note: '' },
    action: isWithdrawal ? recordWithdrawal : recordFunding,
    successMessage: isWithdrawal
      ? MESSAGES.LEDGER.WITHDRAWAL_RECORDED
      : MESSAGES.LEDGER.FUNDING_RECORDED,
    onSuccess: onDone,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberTextField name="amount" label="Amount (USD)" />
          <DateField name="occurredOn" label="Date" />
        </div>
        <SelectField
          name="accountId"
          label={isWithdrawal ? 'Paid out of' : 'Paid into (optional)'}
          options={accounts}
          emptyLabel={isWithdrawal ? 'Not recorded' : 'Paid directly, not into an account'}
        />
        <TextField
          name="note"
          label={isWithdrawal ? 'Note' : 'What it paid for'}
          hint={isWithdrawal ? undefined : 'e.g. Upwork connects, LinkedIn Sales Navigator'}
        />
        <SubmitButton isPending={isPending}>
          {isWithdrawal ? 'Record withdrawal' : 'Record funding'}
        </SubmitButton>
      </form>
    </FormProvider>
  );
}

const ENTRY_LABEL: Record<LedgerEntryType, string> = {
  [LedgerEntryType.PROFIT_SHARE]: 'Profit share',
  [LedgerEntryType.RESERVE]: 'Reserve',
  [LedgerEntryType.WITHDRAWAL]: 'Withdrawal',
  [LedgerEntryType.FUNDING_IN]: 'Funding in',
  [LedgerEntryType.ADJUSTMENT]: 'Adjustment',
};

type PartnerLedgerCardProps = { ledger: PartnerLedgerView; accounts: Option[]; today: string };

/** PRD §5.6: share earned each month, withdrawals, and a pending balance that carries forward. */
export function PartnerLedgerCard({ ledger, accounts, today }: PartnerLedgerCardProps) {
  const { run, isPending } = useActionRunner();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{ledger.partnerName}</CardTitle>
        <CardAction className="flex gap-1">
          <FormDialog
            title={`Withdrawal — ${ledger.partnerName}`}
            trigger={
              <Button size="sm" variant="outline">
                <ArrowUpFromLine /> Withdrawal
              </Button>
            }
          >
            {(close) => (
              <MovementForm
                partnerId={ledger.partnerId}
                kind="withdrawal"
                accounts={accounts}
                today={today}
                onDone={close}
              />
            )}
          </FormDialog>
          <FormDialog
            title={`Funding from ${ledger.partnerName}`}
            description="Money the partner put in for company costs. Recorded, but not withdrawable profit."
            trigger={
              <Button size="sm" variant="ghost">
                <ArrowDownToLine /> Funding
              </Button>
            }
          >
            {(close) => (
              <MovementForm
                partnerId={ledger.partnerId}
                kind="funding"
                accounts={accounts}
                today={today}
                onDone={close}
              />
            )}
          </FormDialog>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-0.5">
            <span className="text-muted-foreground text-xs">Pending to withdraw</span>
            <Money value={ledger.pending} emphasizeNegative className="text-lg font-semibold" />
          </div>
          <div className="grid gap-0.5">
            <span className="text-muted-foreground text-xs">Reserves held</span>
            <Money value={ledger.cumulativeReserves} className="text-lg font-semibold" />
          </div>
          <div className="grid gap-0.5">
            <span className="text-muted-foreground text-xs">Funded in</span>
            <Money value={ledger.fundedTotal} className="text-lg font-semibold" />
          </div>
        </div>
        {ledger.months.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nothing yet. Shares and reserves are posted when a month is closed.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Brought forward</TableHead>
                  <TableHead className="text-right">Take-home</TableHead>
                  <TableHead className="text-right">Withdrawn</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.months.map((month) => (
                  <TableRow key={month.month}>
                    <TableCell>{formatMonthLabel(month.month)}</TableCell>
                    <TableCell className="hidden text-right sm:table-cell">
                      <Money value={month.previousPending} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money value={month.takeHome} emphasizeNegative />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money value={month.withdrawn} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <Money value={month.pending} emphasizeNegative />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {ledger.manualEntries.length > 0 ? (
          <ul className="divide-y text-sm">
            {ledger.manualEntries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-2 py-1.5">
                <span className="min-w-0 truncate">
                  {ENTRY_LABEL[entry.type]} · {formatDateLabel(entry.occurredOn)}
                  {entry.accountName ? ` · ${entry.accountName}` : ''}
                  {entry.note ? ` · ${entry.note}` : ''}
                </span>
                <span className="flex items-center gap-1">
                  <Money value={entry.amount} emphasizeNegative />
                  <ConfirmActionButton
                    title="Delete this entry?"
                    description="It is removed from the ledger and the account's expected balance."
                    confirmLabel={MESSAGES.COMMON.DELETE}
                    onConfirm={() =>
                      run(() => deleteLedgerEntry({ id: entry.id }), MESSAGES.COMMON.DELETED)
                    }
                    trigger={
                      <IconButton
                        size="icon-sm"
                        variant="ghost"
                        label="Delete entry"
                        disabled={isPending}
                      >
                        <Trash2 />
                      </IconButton>
                    }
                  />
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
