import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ManageSections } from '@/components/settings/manage-sections';
import { PageHeader } from '@/components/shared/page-header';
import { FormCardSkeleton } from '@/components/shared/skeletons';
import { SETTINGS_SECTION } from '@/lib/settings-sections';

export const metadata: Metadata = { title: 'Team' };

const TEAM_SECTIONS = [SETTINGS_SECTION.TEAM, SETTINGS_SECTION.COMMISSION] as const;

export default function TeamPage() {
  return (
    <>
      <PageHeader
        eyebrow="Books"
        title="Team"
        description="People on payroll and the BD commission rule. Revenue's “closed by” and “referred by” pick from this list."
      />
      <Suspense fallback={<FormCardSkeleton />}>
        <ManageSections sections={TEAM_SECTIONS} />
      </Suspense>
    </>
  );
}
