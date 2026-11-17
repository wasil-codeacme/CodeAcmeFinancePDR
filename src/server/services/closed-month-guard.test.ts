import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FundingSource, ProjectStatus, Role } from '@/generated/prisma/enums';
import { RuleViolationError } from '@/server/errors';

const CLOSED = new RuleViolationError(
  'This month is closed and read-only. Reopen it first: Jan 2026',
);

const mocks = vi.hoisted(() => ({
  assertMonthsOpen: vi.fn(),
  isMonthClosed: vi.fn(),
  createRevenue: vi.fn(),
  createExpense: vi.fn(),
  createAdjustment: vi.fn(),
  findEntry: vi.fn(),
  upsertRate: vi.fn(),
}));

vi.mock('@/server/period-guard', () => ({
  assertMonthsOpen: mocks.assertMonthsOpen,
  isMonthClosed: mocks.isMonthClosed,
}));
vi.mock('@/server/repositories/revenue.repository', () => ({
  revenueRepository: {
    create: mocks.createRevenue,
    findById: mocks.findEntry,
    createAdjustment: mocks.createAdjustment,
  },
}));
vi.mock('@/server/repositories/expense.repository', () => ({
  expenseRepository: { create: mocks.createExpense },
}));
vi.mock('@/server/repositories/settings.repository', () => ({
  exchangeRateRepository: {
    upsert: mocks.upsertRate,
    findByMonth: vi.fn(),
    findEffective: vi.fn(),
  },
  accountRepository: {},
  expenseCategoryRepository: {},
  teamMemberRepository: {},
  commissionRuleRepository: {},
}));
vi.mock('@/server/repositories/company.repository', () => ({
  companyRepository: {
    find: vi.fn().mockResolvedValue({ reportingCurrency: 'USD', displayCurrency: 'PKR' }),
  },
}));
vi.mock('@/server/repositories/client.repository', () => ({
  clientRepository: { findById: vi.fn() },
  projectRepository: { findById: vi.fn() },
}));
vi.mock('@/server/repositories/platform.repository', () => ({
  platformRepository: { list: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/server/repositories/audit.repository', () => ({ auditRepository: { record: vi.fn() } }));
vi.mock('@/server/repositories/db', () => ({
  runInTransaction: (work: () => Promise<unknown>) => work(),
}));

const { createRevenueEntry } = await import('@/server/services/revenue.service');
const { createExpense } = await import('@/server/services/expense.service');
const { adjustReceivable } = await import('@/server/services/receivable.service');
const { saveExchangeRate } = await import('@/server/services/settings.service');

const ACTOR = { id: 'founder-1', email: 'a@example.test', name: 'A', role: Role.FOUNDER };

describe('closed months are read-only (PRD §5.6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertMonthsOpen.mockRejectedValue(CLOSED);
  });

  it('refuses revenue booked into a closed month', async () => {
    await expect(
      createRevenueEntry(ACTOR, {
        clientId: 'client-1',
        projectId: null,
        gross: '100',
        bookingMonth: '2026-01',
        projectStatus: ProjectStatus.IN_PROGRESS,
      }),
    ).rejects.toThrow(CLOSED);
    expect(mocks.assertMonthsOpen).toHaveBeenCalledWith('2026-01');
    expect(mocks.createRevenue).not.toHaveBeenCalled();
  });

  it('refuses an expense dated in a closed month, or paid in one', async () => {
    await expect(
      createExpense(ACTOR, {
        expenseDate: '2026-02-10',
        paidOn: '2026-01-25',
        categoryId: 'category-1',
        item: 'Advance rent',
        payeeTeamMemberId: null,
        amount: '100',
        currency: 'USD',
        fundingSource: FundingSource.COMPANY,
        fundingPartnerId: null,
        paidFromAccountId: null,
        notes: null,
      }),
    ).rejects.toThrow(CLOSED);
    expect(mocks.assertMonthsOpen).toHaveBeenCalledWith('2026-02', '2026-01');
    expect(mocks.createExpense).not.toHaveBeenCalled();
  });

  it('refuses a rate change for a closed month', async () => {
    await expect(saveExchangeRate(ACTOR, { month: '2026-01', rate: '280' })).rejects.toThrow(
      CLOSED,
    );
    expect(mocks.upsertRate).not.toHaveBeenCalled();
  });
});

describe('write-offs on a closed month', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createAdjustment.mockResolvedValue({ id: 'adjustment-1' });
  });

  it('post to the month of the write-off date instead (PRD §5.6)', async () => {
    mocks.findEntry.mockResolvedValue({
      id: 'entry-1',
      status: 'CONFIRMED',
      bookingMonth: '2026-01',
      gross: '100',
      feePercent: '0',
      receipts: [],
      adjustments: [],
    });
    mocks.isMonthClosed.mockResolvedValue(true);
    mocks.assertMonthsOpen.mockResolvedValue(undefined);
    await adjustReceivable(ACTOR, {
      revenueEntryId: 'entry-1',
      kind: 'WRITE_OFF',
      adjustedOn: '2026-03-05',
      reason: 'Client went quiet',
    });
    expect(mocks.assertMonthsOpen).toHaveBeenCalledWith('2026-03');
    expect(mocks.createAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({ postingMonth: '2026-03', amount: '100' }),
    );
  });

  it('stay in the booking month while it is open', async () => {
    mocks.findEntry.mockResolvedValue({
      id: 'entry-1',
      status: 'CONFIRMED',
      bookingMonth: '2026-01',
      gross: '100',
      feePercent: '0',
      receipts: [],
      adjustments: [],
    });
    mocks.isMonthClosed.mockResolvedValue(false);
    mocks.assertMonthsOpen.mockResolvedValue(undefined);
    await adjustReceivable(ACTOR, {
      revenueEntryId: 'entry-1',
      kind: 'WRITE_OFF',
      adjustedOn: '2026-03-05',
      reason: 'Client went quiet',
    });
    expect(mocks.createAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({ postingMonth: '2026-01' }),
    );
  });
});
