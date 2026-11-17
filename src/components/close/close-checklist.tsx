'use client';

import { CircleAlert, CircleCheck, Lock, LockOpen } from 'lucide-react';
import Link from 'next/link';
import { FormProvider } from 'react-hook-form';

import { ConfirmActionButton } from '@/components/shared/confirm-action-button';
import { TextField } from '@/components/shared/form-fields';
import { FormDialog } from '@/components/shared/form-dialog';
import { Money } from '@/components/shared/money';
import { SectionCard } from '@/components/shared/section-card';
import { SubmitButton } from '@/components/shared/submit-button';
import { Button } from '@/components/ui/button';
import { useActionForm } from '@/hooks/use-action-form';
import { useActionRunner } from '@/hooks/use-action-runner';
import { SEARCH_PARAM } from '@/lib/constants';
import { Decimal } from '@/lib/decimal';
import { MESSAGES } from '@/lib/messages';
import { type MonthKey, formatLongMonthLabel } from '@/lib/month';
import { ROUTES, withSearchParams } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { closeMonth, postBdCommission, reopenMonth } from '@/server/actions/period.actions';
import { reopenMonthSchema } from '@/server/validators/period.schema';
import type { CloseChecks } from '@/types/period';
import type { ReactNode } from 'react';

function Check({ ok, label, action }: { ok: boolean; label: ReactNode; action?: ReactNode }) {
  const Icon = ok ? CircleCheck : CircleAlert;
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2">
      <span className="flex items-center gap-2 text-sm">
        <Icon className={cn('size-4', ok ? 'text-emerald-600' : 'text-amber-600')} />
        {label}
      </span>
      {action}
    </li>
  );
}

function ReopenForm({ month, onDone }: { month: MonthKey; onDone: () => void }) {
  const { form, submit, isPending } = useActionForm({
    schema: reopenMonthSchema,
    defaultValues: { month, reason: '' },
    action: reopenMonth,
    successMessage: MESSAGES.PERIOD.REOPENED,
    onSuccess: onDone,
  });
  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <TextField name="reason" label="Why reopen it?" hint="Kept in the audit log." />
        <SubmitButton isPending={isPending}>Reopen month</SubmitButton>
      </form>
    </FormProvider>
  );
}

type CloseChecklistProps = { month: MonthKey; checks: CloseChecks; isClosed: boolean };

/** Blocking checks gate the close; the others are reminders the founder can accept. */
export function CloseChecklist({ month, checks, isClosed }: CloseChecklistProps) {
  const { run, isPending } = useActionRunner();
  const monthLink = (href: string) => withSearchParams(href, { [SEARCH_PARAM.MONTH]: month });
  const commissionDue = !new Decimal(checks.commissionDue).isZero();
  const ready = checks.drafts === 0 && checks.rateSet && checks.splitSet;
  if (isClosed) {
    return (
      <SectionCard
        title="This month is closed"
        description="Its figures are locked and served from the snapshot taken at close."
      >
        <FormDialog
          title={`Reopen ${formatLongMonthLabel(month)}?`}
          description="The ledger postings from the close are removed, and the month becomes editable again."
          trigger={
            <Button variant="outline">
              <LockOpen /> Reopen month
            </Button>
          }
        >
          {(close) => <ReopenForm month={month} onDone={close} />}
        </FormDialog>
      </SectionCard>
    );
  }
  return (
    <SectionCard
      title="Before closing"
      description="Closing locks the month and posts each partner's share to the ledger."
    >
      <ul className="divide-y">
        <Check
          ok={checks.drafts === 0}
          label={
            checks.drafts === 0
              ? 'No drafts waiting'
              : `${checks.drafts} drafts to confirm or delete`
          }
          action={
            checks.drafts > 0 ? (
              <Button asChild size="sm" variant="ghost">
                <Link href={monthLink(ROUTES.EXPENSES)} prefetch>
                  Review drafts
                </Link>
              </Button>
            ) : null
          }
        />
        <Check
          ok={checks.rateSet}
          label={checks.rateSet ? 'Exchange rate set' : 'No exchange rate for this month'}
        />
        <Check
          ok={checks.splitSet}
          label={checks.splitSet ? 'Profit split in force' : 'No profit split for this month'}
        />
        <Check
          ok={!commissionDue || checks.commissionPosted}
          label={
            commissionDue ? (
              <>
                BD commission due: <Money value={checks.commissionDue} />
                {checks.commissionPosted ? ' (posted)' : ''}
              </>
            ) : (
              'No BD commission due'
            )
          }
          action={
            commissionDue && !checks.commissionPosted ? (
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  run(
                    () => postBdCommission({ month }),
                    (count: number) => `${count} commission draft(s) posted.`,
                  )
                }
              >
                Post commission
              </Button>
            ) : null
          }
        />
        <Check
          ok={checks.balancesEntered === checks.activeAccounts}
          label={`Closing balances entered for ${checks.balancesEntered} of ${checks.activeAccounts} accounts`}
          action={
            checks.balancesEntered < checks.activeAccounts ? (
              <Button asChild size="sm" variant="ghost">
                <Link href={monthLink(ROUTES.ACCOUNTS)} prefetch>
                  Enter balances
                </Link>
              </Button>
            ) : null
          }
        />
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
        <ConfirmActionButton
          title={`Close ${formatLongMonthLabel(month)}?`}
          description="The P&L and distribution are saved as they are now, partner shares and reserves are posted, and the month becomes read-only. A founder can reopen it with a reason."
          confirmLabel="Close month"
          onConfirm={() => run(() => closeMonth({ month }), MESSAGES.PERIOD.CLOSED)}
          trigger={
            <Button disabled={!ready || isPending}>
              <Lock /> Close month
            </Button>
          }
        />
        {!ready ? (
          <span className="text-muted-foreground text-xs">
            Fix the items marked above to close.
          </span>
        ) : null}
      </div>
    </SectionCard>
  );
}
