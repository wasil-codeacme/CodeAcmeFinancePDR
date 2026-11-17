import { PERMISSION, type Permission } from '@/lib/permissions';
import { ROUTES } from '@/lib/routes';

export const NAV_ICON = {
  DASHBOARD: 'dashboard',
  REVENUE: 'revenue',
  RECEIVABLES: 'receivables',
  EXPENSES: 'expenses',
  RECURRING: 'recurring',
  PNL: 'pnl',
  CLIENTS: 'clients',
  SETTINGS: 'settings',
  ACCOUNTS: 'accounts',
  PARTNERS: 'partners',
  CLOSE: 'close',
} as const;
export type NavIcon = (typeof NAV_ICON)[keyof typeof NAV_ICON];

export type NavItem = {
  label: string;
  shortLabel: string;
  href: string;
  icon: NavIcon;
  permission: Permission;
  /** Shown in the phone bottom tab bar; the rest sit behind "More". */
  inTabBar: boolean;
};

export type NavGroup = { label: string; items: readonly NavItem[] };

/** The one list the sidebar, the phone tab bar and the breadcrumbs read from. */
export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: 'Overview',
    items: [
      {
        label: 'Dashboard',
        shortLabel: 'Home',
        href: ROUTES.HOME,
        icon: NAV_ICON.DASHBOARD,
        permission: PERMISSION.REPORTS_VIEW,
        inTabBar: true,
      },
      {
        label: 'P&L',
        shortLabel: 'P&L',
        href: ROUTES.PNL,
        icon: NAV_ICON.PNL,
        permission: PERMISSION.REPORTS_VIEW,
        inTabBar: true,
      },
    ],
  },
  {
    label: 'Books',
    items: [
      {
        label: 'Revenue',
        shortLabel: 'Revenue',
        href: ROUTES.REVENUE,
        icon: NAV_ICON.REVENUE,
        permission: PERMISSION.ENTRIES_WRITE,
        inTabBar: true,
      },
      {
        label: 'Receivables',
        shortLabel: 'Owed',
        href: ROUTES.RECEIVABLES,
        icon: NAV_ICON.RECEIVABLES,
        permission: PERMISSION.ENTRIES_WRITE,
        inTabBar: false,
      },
      {
        label: 'Recurring expenses',
        shortLabel: 'Recurring',
        href: ROUTES.RECURRING_TEMPLATES,
        icon: NAV_ICON.RECURRING,
        permission: PERMISSION.ENTRIES_WRITE,
        inTabBar: false,
      },
      {
        label: 'Expenses',
        shortLabel: 'Expenses',
        href: ROUTES.EXPENSES,
        icon: NAV_ICON.EXPENSES,
        permission: PERMISSION.ENTRIES_WRITE,
        inTabBar: true,
      },
      {
        label: 'Clients',
        shortLabel: 'Clients',
        href: ROUTES.CLIENTS,
        icon: NAV_ICON.CLIENTS,
        permission: PERMISSION.ENTRIES_WRITE,
        inTabBar: false,
      },
    ],
  },
  {
    label: 'Month end',
    items: [
      {
        label: 'Accounts',
        shortLabel: 'Accounts',
        href: ROUTES.ACCOUNTS,
        icon: NAV_ICON.ACCOUNTS,
        permission: PERMISSION.BALANCES_WRITE,
        inTabBar: false,
      },
      {
        label: 'Partners',
        shortLabel: 'Partners',
        href: ROUTES.PARTNERS,
        icon: NAV_ICON.PARTNERS,
        permission: PERMISSION.DISTRIBUTION_VIEW,
        inTabBar: false,
      },
      {
        label: 'Month close',
        shortLabel: 'Close',
        href: ROUTES.CLOSE,
        icon: NAV_ICON.CLOSE,
        permission: PERMISSION.PERIOD_CLOSE,
        inTabBar: false,
      },
    ],
  },
  {
    label: 'Admin',
    items: [
      {
        label: 'Settings',
        shortLabel: 'Settings',
        href: ROUTES.SETTINGS.ROOT,
        icon: NAV_ICON.SETTINGS,
        permission: PERMISSION.SETTINGS_MANAGE,
        inTabBar: false,
      },
    ],
  },
];

export const NAV_ITEMS: readonly NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

/** The nav item a pathname belongs to: the longest href that prefixes it (so /expenses/recurring beats /expenses). */
export function navItemFor(pathname: string): NavItem | null {
  const matches = NAV_ITEMS.filter((item) =>
    item.href === ROUTES.HOME ? pathname === ROUTES.HOME : pathname.startsWith(item.href),
  );
  return matches.sort((left, right) => right.href.length - left.href.length)[0] ?? null;
}
