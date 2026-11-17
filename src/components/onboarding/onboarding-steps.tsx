import { CheckCircle2, Circle } from 'lucide-react';
import Link from 'next/link';

import { SEARCH_PARAM } from '@/lib/constants';
import { ROUTES, withSearchParams } from '@/lib/routes';
import { SETTINGS_SECTION, SETTINGS_SECTIONS, type SettingsSection } from '@/lib/settings-sections';
import { cn } from '@/lib/utils';
import type { OnboardingStatus } from '@/types/onboarding';

/** Maps each onboarding step to whether its required data exists yet. */
export function stepIsDone(section: SettingsSection, status: OnboardingStatus): boolean {
  switch (section) {
    case SETTINGS_SECTION.COMPANY:
      return status.company;
    case SETTINGS_SECTION.PARTNERS:
      return status.partners && status.reserveRule;
    case SETTINGS_SECTION.ACCOUNTS:
      return status.accounts;
    case SETTINGS_SECTION.PLATFORMS:
      return status.platforms;
    case SETTINGS_SECTION.CATEGORIES:
      return status.categories;
    case SETTINGS_SECTION.RATES:
      return status.exchangeRate;
    case SETTINGS_SECTION.COMMISSION:
    case SETTINGS_SECTION.TEAM:
    case SETTINGS_SECTION.USERS:
    case SETTINGS_SECTION.IMPORT:
      return false;
  }
}

type OnboardingStepsProps = { current: SettingsSection; status: OnboardingStatus };

export function OnboardingSteps({ current, status }: OnboardingStepsProps) {
  return (
    <ol className="grid gap-1">
      {SETTINGS_SECTIONS.map((meta, index) => {
        const done = stepIsDone(meta.section, status);
        const Icon = done ? CheckCircle2 : Circle;
        return (
          <li key={meta.section}>
            <Link
              href={withSearchParams(ROUTES.ONBOARDING, { [SEARCH_PARAM.STEP]: meta.section })}
              aria-current={meta.section === current ? 'step' : undefined}
              className={cn(
                'hover:bg-muted flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                meta.section === current && 'bg-muted font-medium',
              )}
            >
              <Icon className={cn('size-4', done ? 'text-emerald-600' : 'text-muted-foreground')} />
              <span>
                {index + 1}. {meta.label}
              </span>
              {!meta.required ? (
                <span className="text-muted-foreground ml-auto text-xs">optional</span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
