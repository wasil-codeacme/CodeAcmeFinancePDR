import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { Role } from '@/generated/prisma/enums';
import { MESSAGES } from '@/lib/messages';
import { NAV_ITEMS } from '@/lib/navigation';
import { PERMISSION, type Permission, hasPermission } from '@/lib/permissions';
import { parseReportPeriod } from '@/lib/report-period';
import { EXPORT_FORMAT, REPORTS, REPORT_KIND } from '@/lib/reports';
import { ROUTES } from '@/lib/routes';
import { ForbiddenError } from '@/server/errors';
import type { SessionUser } from '@/types/auth';

/**
 * PRD build step 4, "done when": a finance manager test user cannot get any founder-only
 * figure through the UI, API or exports. Pages are checked by hand against a running app;
 * this pins the server-side gates every one of those paths goes through.
 */
const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn() }));
vi.mock('next/cache', () => ({ refresh: vi.fn(), updateTag: vi.fn() }));
vi.mock('@/server/auth/current-user', () => ({ getCurrentUser: mocks.getCurrentUser }));

const FINANCE_MANAGER: SessionUser = {
  id: 'fm',
  email: 'fm.test@example.test',
  name: 'Finance Manager Test',
  role: Role.FINANCE_MANAGER,
};

const FOUNDER_ONLY: readonly Permission[] = [
  PERMISSION.DISTRIBUTION_VIEW,
  PERMISSION.PARTNER_LEDGER_WRITE,
  PERMISSION.PERIOD_CLOSE,
  PERMISSION.SETTINGS_MANAGE,
  PERMISSION.USERS_MANAGE,
  PERMISSION.ENTRIES_DELETE_CONFIRMED,
  PERMISSION.DATA_EXPORT,
];

beforeEach(() => mocks.getCurrentUser.mockResolvedValue(FINANCE_MANAGER));

describe('server actions (the API) refuse founder-only work before running it', () => {
  it.each(FOUNDER_ONLY)('refuses %s and never calls the handler', async (permission) => {
    const { writeAction } = await import('@/server/actions/action');
    const handler = vi.fn();
    const action = writeAction({ schema: z.object({}), permission, handler });
    await expect(action({})).resolves.toEqual({ error: MESSAGES.COMMON.FORBIDDEN });
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('reports and exports', () => {
  const now = new Date('2026-11-17T00:00:00Z');
  const period = parseReportPeriod('2026', now);

  it('refuses the partner distribution report and its export', async () => {
    const { exportReport, getReport } = await import('@/server/services/report.service');
    await expect(
      getReport(FINANCE_MANAGER, REPORT_KIND.DISTRIBUTION, period, now),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      exportReport(FINANCE_MANAGER, REPORT_KIND.DISTRIBUTION, period, now, EXPORT_FORMAT.CSV),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('refuses the all-data export, which carries the partner ledger', async () => {
    const { exportAllData } = await import('@/server/services/data-export.service');
    await expect(exportAllData(FINANCE_MANAGER, now)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('offers the finance manager every report except partner distribution', () => {
    const visible = REPORTS.filter((report) =>
      hasPermission(Role.FINANCE_MANAGER, report.permission),
    );
    expect(visible.map((report) => report.kind)).not.toContain(REPORT_KIND.DISTRIBUTION);
    expect(visible.map((report) => report.kind)).toContain(REPORT_KIND.PNL);
  });
});

describe('navigation', () => {
  it('shows no founder-only page to the finance manager', () => {
    const hrefs = NAV_ITEMS.filter((item) =>
      hasPermission(Role.FINANCE_MANAGER, item.permission),
    ).map((item) => item.href);
    for (const founderOnly of [
      ROUTES.PARTNERS,
      ROUTES.CLOSE,
      ROUTES.SETTINGS.ROOT,
      ROUTES.TEAM,
      ROUTES.EXCHANGE_RATES,
    ]) {
      expect(hrefs).not.toContain(founderOnly);
    }
    expect(hrefs).toContain(ROUTES.ACCOUNTS);
  });
});
