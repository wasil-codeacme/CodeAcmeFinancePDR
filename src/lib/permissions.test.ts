import { describe, expect, it } from 'vitest';

import { Role } from '@/generated/prisma/enums';
import { PERMISSION, hasPermission } from '@/lib/permissions';

describe('role permissions (PRD §3)', () => {
  it('lets founders do everything', () => {
    for (const permission of Object.values(PERMISSION)) {
      expect(hasPermission(Role.FOUNDER, permission)).toBe(true);
    }
  });

  it('lets the finance manager keep the books and see the P&L', () => {
    expect(hasPermission(Role.FINANCE_MANAGER, PERMISSION.ENTRIES_WRITE)).toBe(true);
    expect(hasPermission(Role.FINANCE_MANAGER, PERMISSION.BALANCES_WRITE)).toBe(true);
    expect(hasPermission(Role.FINANCE_MANAGER, PERMISSION.REPORTS_VIEW)).toBe(true);
    expect(hasPermission(Role.FINANCE_MANAGER, PERMISSION.REPORTS_EXPORT)).toBe(true);
  });

  it.each([
    PERMISSION.DISTRIBUTION_VIEW,
    PERMISSION.PARTNER_LEDGER_WRITE,
    PERMISSION.PERIOD_CLOSE,
    PERMISSION.SETTINGS_MANAGE,
    PERMISSION.USERS_MANAGE,
    PERMISSION.ENTRIES_DELETE_CONFIRMED,
  ])('keeps founder-only %s away from the finance manager', (permission) => {
    expect(hasPermission(Role.FINANCE_MANAGER, permission)).toBe(false);
  });
});
