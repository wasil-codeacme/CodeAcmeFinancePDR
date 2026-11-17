import { ROUTES } from '@/lib/routes';

export const SETTINGS_SECTION = {
  COMPANY: 'company',
  PARTNERS: 'partners',
  COMMISSION: 'commission',
  ACCOUNTS: 'accounts',
  PLATFORMS: 'platforms',
  CATEGORIES: 'categories',
  TEAM: 'team',
  RATES: 'rates',
  USERS: 'users',
  IMPORT: 'import',
} as const;
export type SettingsSection = (typeof SETTINGS_SECTION)[keyof typeof SETTINGS_SECTION];

export type SettingsSectionMeta = {
  section: SettingsSection;
  label: string;
  href: string;
  /** Required before the books can be used; optional steps can be skipped in onboarding. */
  required: boolean;
};

/** PRD §5.5 order: the onboarding walk-through and the Settings tabs share it. */
export const SETTINGS_SECTIONS: readonly SettingsSectionMeta[] = [
  {
    section: SETTINGS_SECTION.COMPANY,
    label: 'Company',
    href: ROUTES.SETTINGS.COMPANY,
    required: true,
  },
  {
    section: SETTINGS_SECTION.PARTNERS,
    label: 'Partners & reserve',
    href: ROUTES.SETTINGS.PARTNERS,
    required: true,
  },
  {
    section: SETTINGS_SECTION.COMMISSION,
    label: 'BD commission',
    href: ROUTES.SETTINGS.COMMISSION,
    required: false,
  },
  {
    section: SETTINGS_SECTION.ACCOUNTS,
    label: 'Accounts',
    href: ROUTES.SETTINGS.ACCOUNTS,
    required: true,
  },
  {
    section: SETTINGS_SECTION.PLATFORMS,
    label: 'Platforms',
    href: ROUTES.SETTINGS.PLATFORMS,
    required: true,
  },
  {
    section: SETTINGS_SECTION.CATEGORIES,
    label: 'Expense categories',
    href: ROUTES.SETTINGS.CATEGORIES,
    required: true,
  },
  {
    section: SETTINGS_SECTION.TEAM,
    label: 'Team members',
    href: ROUTES.SETTINGS.TEAM,
    required: false,
  },
  {
    section: SETTINGS_SECTION.RATES,
    label: 'Exchange rates',
    href: ROUTES.SETTINGS.RATES,
    required: true,
  },
  { section: SETTINGS_SECTION.USERS, label: 'Users', href: ROUTES.SETTINGS.USERS, required: false },
  {
    section: SETTINGS_SECTION.IMPORT,
    label: 'Import workbook',
    href: ROUTES.SETTINGS.IMPORT,
    required: false,
  },
];

export function isSettingsSection(value: string | undefined): value is SettingsSection {
  return SETTINGS_SECTIONS.some((meta) => meta.section === value);
}
