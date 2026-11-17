import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { FinishOnboardingButton } from '@/components/onboarding/finish-onboarding-button';
import { OnboardingSteps, stepIsDone } from '@/components/onboarding/onboarding-steps';
import { SettingsSectionView } from '@/components/settings/settings-section-view';
import { PageHeader } from '@/components/shared/page-header';
import { FormCardSkeleton } from '@/components/shared/skeletons';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { SEARCH_PARAM } from '@/lib/constants';
import { currentMonthKey } from '@/lib/month';
import { PERMISSION, hasPermission } from '@/lib/permissions';
import { ROUTES, withSearchParams } from '@/lib/routes';
import { SETTINGS_SECTIONS, isSettingsSection } from '@/lib/settings-sections';
import { requireUser } from '@/server/auth/current-user';
import { getOnboardingStatus } from '@/server/services/company.service';

export const metadata: Metadata = { title: 'Set up' };

async function OnboardingContent({ searchParams }: Pick<PageProps<'/onboarding'>, 'searchParams'>) {
  const [user] = await Promise.all([requireUser(), connection()]);
  if (!hasPermission(user.role, PERMISSION.SETTINGS_MANAGE)) {
    return (
      <p className="text-muted-foreground bg-card rounded-xl border p-6 text-sm">
        A founder is still setting up the books. You will be able to start once they finish.
      </p>
    );
  }
  const step = (await searchParams)[SEARCH_PARAM.STEP];
  const firstStep = SETTINGS_SECTIONS[0];
  const currentIndex = SETTINGS_SECTIONS.findIndex(
    (meta) =>
      meta.section ===
      (typeof step === 'string' && isSettingsSection(step) ? step : firstStep?.section),
  );
  const current = SETTINGS_SECTIONS[currentIndex];
  const previous = SETTINGS_SECTIONS[currentIndex - 1];
  const next = SETTINGS_SECTIONS[currentIndex + 1];
  const status = await getOnboardingStatus();
  if (!current) return null;
  const ready = SETTINGS_SECTIONS.every(
    (meta) => !meta.required || stepIsDone(meta.section, status),
  );
  const stepHref = (section: string) =>
    withSearchParams(ROUTES.ONBOARDING, { [SEARCH_PARAM.STEP]: section });

  return (
    <div className="grid gap-6">
      {status.completedAt ? (
        <div>
          <Button asChild variant="outline">
            <Link href={ROUTES.HOME}>Setup is complete — go to dashboard</Link>
          </Button>
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside className="bg-card rounded-xl border p-2 shadow-xs lg:sticky lg:top-6 lg:self-start">
          <OnboardingSteps current={current.section} status={status} />
        </aside>
        <section className="grid min-w-0 gap-4">
          <h2 className="text-lg font-semibold">{current.label}</h2>
          <SettingsSectionView
            section={current.section}
            currentUserId={user.id}
            currentMonth={currentMonthKey(new Date())}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
            {previous ? (
              <Button asChild variant="ghost">
                <Link href={stepHref(previous.section)}>Back</Link>
              </Button>
            ) : (
              <span />
            )}
            {next ? (
              <Button asChild>
                <Link href={stepHref(next.section)}>
                  {current.required ? 'Next' : 'Next (or skip)'}
                </Link>
              </Button>
            ) : (
              <FinishOnboardingButton ready={ready && !status.completedAt} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/** PRD §5.5: first login walks a founder through Settings in order. */
export default function OnboardingPage({ searchParams }: PageProps<'/onboarding'>) {
  return (
    <>
      <PageHeader
        eyebrow="Setup"
        title="Set up your books"
        description="Enter the business rules once. You can change any of them later in Settings."
      />
      <Suspense
        fallback={
          <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
            <Skeleton className="h-80 rounded-xl" />
            <FormCardSkeleton />
          </div>
        }
      >
        <OnboardingContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
