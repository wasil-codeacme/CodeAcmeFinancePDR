import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { PartnerLedgerCard } from '@/components/partners/partner-ledger-card';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { CardListSkeleton } from '@/components/shared/skeletons';
import { toIsoDate } from '@/lib/month';
import { PERMISSION } from '@/lib/permissions';
import { requireBooksUser } from '@/server/auth/current-user';
import { getPartnerLedgers } from '@/server/services/partner-ledger.service';
import { listAccounts } from '@/server/services/settings.service';

export const metadata: Metadata = { title: 'Partners' };

async function PartnersContent() {
  await Promise.all([requireBooksUser(PERMISSION.DISTRIBUTION_VIEW), connection()]);
  const [ledgers, accounts] = await Promise.all([getPartnerLedgers(), listAccounts()]);
  if (ledgers.length === 0) {
    return (
      <EmptyState title="No partners yet" description="Add partners in Settings → Partners." />
    );
  }
  const accountOptions = accounts
    .filter((account) => account.active)
    .map((account) => ({ value: account.id, label: account.name }));
  const today = toIsoDate(new Date());
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {ledgers.map((ledger) => (
        <PartnerLedgerCard
          key={ledger.partnerId}
          ledger={ledger}
          accounts={accountOptions}
          today={today}
        />
      ))}
    </div>
  );
}

export default function PartnersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Month end"
        title="Partners"
        description="Each founder's share, reserves, withdrawals and pending balance. Pending carries forward on its own — nothing is typed."
      />
      <Suspense fallback={<CardListSkeleton count={2} />}>
        <PartnersContent />
      </Suspense>
    </>
  );
}
