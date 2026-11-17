import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CommissionBase, EntryStatus, ExpenseKind, Role } from '@/generated/prisma/enums';
import { Decimal } from '@/lib/decimal';
import { MESSAGES } from '@/lib/messages';

const mocks = vi.hoisted(() => ({
  assertMonthsOpen: vi.fn(),
  loadBdCommission: vi.fn(),
  listByKindForMonth: vi.fn(),
  create: vi.fn(),
  softDelete: vi.fn(),
  record: vi.fn(),
}));

vi.mock('@/server/period-guard', () => ({ assertMonthsOpen: mocks.assertMonthsOpen }));
vi.mock('@/server/read-models/bd-commission', () => ({ loadBdCommission: mocks.loadBdCommission }));
vi.mock('@/server/repositories/expense.repository', () => ({
  expenseRepository: {
    listByKindForMonth: mocks.listByKindForMonth,
    create: mocks.create,
    softDelete: mocks.softDelete,
  },
}));
vi.mock('@/server/repositories/company.repository', () => ({
  companyRepository: {
    find: vi.fn().mockResolvedValue({ reportingCurrency: 'USD', displayCurrency: 'PKR' }),
  },
}));
vi.mock('@/server/repositories/audit.repository', () => ({
  auditRepository: { record: mocks.record },
}));
vi.mock('@/server/repositories/db', () => ({
  runInTransaction: (work: () => Promise<unknown>) => work(),
}));

const { postBdCommission } = await import('@/server/services/commission.service');

const ACTOR = { id: 'founder-1', email: 'a@example.test', name: 'A', role: Role.FOUNDER };
const RULE = {
  id: 'rule-1',
  effectiveFrom: '2026-01',
  ratePercent: '6',
  base: CommissionBase.NET_REVENUE,
  categoryId: 'sales-salaries',
};
const DUE = [
  { teamMemberId: 'bd-1', name: 'Employee 2', base: new Decimal(900), commission: new Decimal(54) },
];

describe('postBdCommission (PRD §6: posted as a company sales expense)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadBdCommission.mockResolvedValue({ rule: RULE, rows: DUE });
    mocks.listByKindForMonth.mockResolvedValue([]);
    mocks.create.mockImplementation(async (data) => ({ id: 'expense-1', ...data }));
  });

  it('drafts one company expense per BD person for the month', async () => {
    await expect(postBdCommission(ACTOR, '2026-03')).resolves.toBe(1);
    expect(mocks.assertMonthsOpen).toHaveBeenCalledWith('2026-03');
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: ExpenseKind.BD_COMMISSION,
        status: EntryStatus.DRAFT,
        categoryId: 'sales-salaries',
        payeeTeamMemberId: 'bd-1',
        amount: '54.00',
        currency: 'USD',
        fundingSource: 'COMPANY',
      }),
      ACTOR.id,
    );
  });

  it('replaces earlier drafts but never touches a confirmed commission', async () => {
    mocks.listByKindForMonth.mockResolvedValue([
      { id: 'old-draft', status: EntryStatus.DRAFT, payeeTeamMemberId: 'bd-1' },
      { id: 'kept', status: EntryStatus.CONFIRMED, payeeTeamMemberId: 'bd-2' },
    ]);
    mocks.loadBdCommission.mockResolvedValue({
      rule: RULE,
      rows: [
        ...DUE,
        {
          teamMemberId: 'bd-2',
          name: 'Employee 6',
          base: new Decimal(100),
          commission: new Decimal(6),
        },
      ],
    });
    await expect(postBdCommission(ACTOR, '2026-03')).resolves.toBe(1);
    expect(mocks.softDelete).toHaveBeenCalledWith('old-draft', ACTOR.id);
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it('needs a commission rule with a category', async () => {
    mocks.loadBdCommission.mockResolvedValue({ rule: { ...RULE, categoryId: null }, rows: DUE });
    await expect(postBdCommission(ACTOR, '2026-03')).rejects.toThrow(
      MESSAGES.COMMISSION.CATEGORY_REQUIRED,
    );
  });

  it('says so when nothing is due', async () => {
    mocks.loadBdCommission.mockResolvedValue({ rule: RULE, rows: [] });
    await expect(postBdCommission(ACTOR, '2026-03')).rejects.toThrow(
      MESSAGES.COMMISSION.NOTHING_DUE,
    );
  });
});
