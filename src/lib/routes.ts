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
  PNL: '/pnl',
  CLIENTS: '/clients',
  CLIENT_DETAIL: (clientId: string) => `/clients/${clientId}`,
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
} as const;

/** Routes reachable without a session; everything else requires login. */
export const PUBLIC_ROUTES: readonly string[] = [ROUTES.AUTH.LOGIN, ROUTES.API.HEALTH];

export function withSearchParams(path: string, params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}
