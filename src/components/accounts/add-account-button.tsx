'use client';

import { Plus } from 'lucide-react';

import { CreateAccountForm } from '@/components/settings/accounts-section';
import { FormDialog } from '@/components/shared/form-dialog';
import { Button } from '@/components/ui/button';
import type { MonthKey } from '@/lib/month';

/** Founders can add an account straight from the Accounts page, not only in Settings. */
export function AddAccountButton({ month, currency }: { month: MonthKey; currency: string }) {
  return (
    <FormDialog
      title="Add account"
      description="A bank, platform or wallet money moves through, with its opening balance."
      trigger={
        <Button variant="outline">
          <Plus /> Add account
        </Button>
      }
    >
      {(close) => <CreateAccountForm defaultMonth={month} currency={currency} onDone={close} />}
    </FormDialog>
  );
}
