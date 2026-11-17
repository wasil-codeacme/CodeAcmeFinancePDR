import { Role } from '@/generated/prisma/enums';

/**
 * Roles are sets of permissions so another role can be added by listing what it may do
 * (PRD §3). The server checks permissions, never role names.
 */
export const PERMISSION = {
  ENTRIES_WRITE: 'entries:write',
  ENTRIES_DELETE_CONFIRMED: 'entries:delete-confirmed',
  BALANCES_WRITE: 'balances:write',
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',
  DISTRIBUTION_VIEW: 'distribution:view',
  PARTNER_LEDGER_WRITE: 'partner-ledger:write',
  PERIOD_CLOSE: 'period:close',
  SETTINGS_MANAGE: 'settings:manage',
  USERS_MANAGE: 'users:manage',
  /** PRD §7: founders can export all data (it includes partner figures). */
  DATA_EXPORT: 'data:export',
} as const;
export type Permission = (typeof PERMISSION)[keyof typeof PERMISSION];

const ALL_PERMISSIONS: readonly Permission[] = Object.values(PERMISSION);

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  [Role.FOUNDER]: ALL_PERMISSIONS,
  [Role.FINANCE_MANAGER]: [
    PERMISSION.ENTRIES_WRITE,
    PERMISSION.BALANCES_WRITE,
    PERMISSION.REPORTS_VIEW,
    PERMISSION.REPORTS_EXPORT,
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
