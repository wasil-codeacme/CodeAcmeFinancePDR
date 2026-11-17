export const ROUTES = {
  HOME: '/',
  AUTH: {
    LOGIN: '/login',
  },
  ONBOARDING: '/onboarding',
  REVENUE: '/revenue',
  RECEIVABLES: '/receivables',
  EXPENSES: '/expenses',
  RECURRING_TEMPLATES: '/expenses/recurring',
  EXPENSE_CATEGORIES: '/expenses/categories',
  EXCHANGE_RATES: '/rates',
  TEAM: '/team',
  PNL: '/pnl',
  CLIENTS: '/clients',
  ACCOUNTS: '/accounts',
  ACCOUNT_DETAIL: (accountId: string) => `/accounts/${accountId}`,
  PARTNERS: '/partners',
  CLOSE: '/close',
  CLIENT_DETAIL: (clientId: string) => `/clients/${clientId}`,
  REPORTS: {
    PNL: '/reports',
    DISTRIBUTION: '/reports/distribution',
    RECEIVABLES: '/reports/receivables',
    CASH: '/reports/cash',
    CHARTS: '/reports/charts',
    ENTRIES: '/reports/entries',
    EXPORT: '/reports/export',
  },
  SALES_CAC: '/reports/sales-cac',
  SETTINGS: {
    ROOT: '/settings',
    COMPANY: '/settings/company',
    PARTNERS: '/settings/partners',
    COMMISSION: '/settings/commission',
    ACCOUNTS: '/settings/accounts',
    PLATFORMS: '/settings/platforms',
    CATEGORIES: '/settings/categories',
    TEAM: '/settings/team',
    RATES: '/settings/rates',
    USERS: '/settings/users',
    IMPORT: '/settings/import',
  },
  API: {
    HEALTH: '/api/health',
  },
  /** Generated icons and link-preview images (Next metadata routes). */
  BRAND_IMAGES: ['/icon', '/apple-icon', '/opengraph-image', '/twitter-image'],
} as const;

/** Routes reachable without a session; everything else requires login. */
export const PUBLIC_ROUTES: readonly string[] = [
  ROUTES.AUTH.LOGIN,
  ROUTES.API.HEALTH,
  // Chat apps fetch link previews without a session, so the images must be reachable.
  ...ROUTES.BRAND_IMAGES,
];

export function withSearchParams(path: string, params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}
