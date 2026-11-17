import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { SettingsSectionView } from '@/components/settings/settings-section-view';
import { SettingsTabs } from '@/components/settings/settings-tabs';
import { PageHeader } from '@/components/shared/page-header';
import { FormCardSkeleton } from '@/components/shared/skeletons';
import { Skeleton } from '@/components/ui/skeleton';
import { currentMonthKey } from '@/lib/month';
import { PERMISSION } from '@/lib/permissions';
import { isSettingsSection } from '@/lib/settings-sections';
import { requirePermission } from '@/server/auth/current-user';

export const metadata: Metadata = { title: 'Settings' };

async function SettingsContent({ params }: Pick<PageProps<'/settings/[section]'>, 'params'>) {
  const [user, { section }] = await Promise.all([
    requirePermission(PERMISSION.SETTINGS_MANAGE),
    params,
    connection(),
  ]);
  if (!isSettingsSection(section)) notFound();
  return (
    <SettingsSectionView
      section={section}
      currentUserId={user.id}
      currentMonth={currentMonthKey(new Date())}
    />
  );
}

export default function SettingsSectionPage({ params }: PageProps<'/settings/[section]'>) {
  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Settings"
        description="Business rules live here, not in code. Changes to rules apply from the month you pick."
      />
      <div className="grid gap-6">
        {/* The active tab comes from the URL, which is only known per request. */}
        <Suspense fallback={<Skeleton className="h-9 w-full rounded-lg" />}>
          <SettingsTabs />
        </Suspense>
        <Suspense fallback={<FormCardSkeleton />}>
          <SettingsContent params={params} />
        </Suspense>
      </div>
    </>
  );
}
