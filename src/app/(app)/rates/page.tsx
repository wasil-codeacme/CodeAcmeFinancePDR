import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ManageSections } from '@/components/settings/manage-sections';
import { PageHeader } from '@/components/shared/page-header';
import { FormCardSkeleton } from '@/components/shared/skeletons';
import { SETTINGS_SECTION } from '@/lib/settings-sections';

export const metadata: Metadata = { title: 'Exchange rates' };

const RATE_SECTIONS = [SETTINGS_SECTION.RATES] as const;

export default function RatesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Month end"
        title="Exchange rates"
        description="One rate per month. A month without its own rate uses the latest earlier one, and the P&L says so."
      />
      <Suspense fallback={<FormCardSkeleton />}>
        <ManageSections sections={RATE_SECTIONS} />
      </Suspense>
    </>
  );
}
