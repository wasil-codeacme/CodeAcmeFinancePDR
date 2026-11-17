import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LedgerEntryType, PeriodStatus, Role } from '@/generated/prisma/enums';
import { Decimal } from '@/lib/decimal';
import { MESSAGES } from '@/lib/messages';
import { computeDistribution } from '@/server/domain/distribution';
import { computeMonthlyPnl } from '@/server/domain/pnl';
import { PNL_RESULT } from '@/server/read-models/monthly-pnl';

const mocks = vi.hoisted(() => ({
  findByMonth: vi.fn(),
  markClosed: vi.fn(),
  markReopened: vi.fn(),
  createEntry: vi.fn(),
  softDeleteForPeriod: vi.fn(),
  revenueDrafts: vi.fn(),
  expenseDrafts: vi.fn(),
  loadMonthlyPnl: vi.fn(),
  record: vi.fn(),
}));

vi.mock('@/server/repositories/period.repository', () => ({
  periodRepository: {
    findByMonth: mocks.findByMonth,
    markClosed: mocks.markClosed,
    markReopened: mocks.markReopened,
  },
  nextMonthReserveRepository: {},
}));
vi.mock('@/server/repositories/ledger.repository', () => ({
  ledgerRepository: { create: mocks.createEntry, softDeleteForPeriod: mocks.softDeleteForPeriod },
}));
vi.mock('@/server/repositories/revenue.repository', () => ({
  revenueRepository: { countDraftsForMonth: mocks.revenueDrafts },
}));
vi.mock('@/server/repositories/expense.repository', () => ({
  expenseRepository: { countDraftsForMonth: mocks.expenseDrafts },
}));
vi.mock('@/server/read-models/monthly-pnl', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/server/read-models/monthly-pnl')>()),
  loadMonthlyPnl: mocks.loadMonthlyPnl,
}));
vi.mock('@/server/repositories/audit.repository', () => ({
  auditRepository: { record: mocks.record },
}));
vi.mock('@/server/repositories/db', () => ({
  runInTransaction: (work: () => Promise<unknown>) => work(),
}));

const { closeMonth, reopenMonth } = await import('@/server/services/period.service');

const ACTOR = { id: 'founder-1', email: 'a@example.test', name: 'A', role: Role.FOUNDER };
const MONTH = '2026-01';

function readyPnl(withSplit: boolean) {
  const pnl = computeMonthlyPnl({
    revenueLines: [{ gross: '1000', feePercent: '0' }],
    adjustmentAmounts: [],
    expenseLines: [],
    categories: [],
    currencies: { reporting: 'USD', display: 'PKR' },
    rate: '278',
    shares: null,
    reserveRule: null,
  });
  const distribution = withSplit
    ? computeDistribution({
        distributableProfit: new Decimal(1000),
        shares: [{ partnerId: 'a', partnerName: 'A', splitPercent: '100' }],
        reserveRule: { enabled: true, reservePercent: '5', appliesInLossMonth: false },
        rate: '278',
      })
    : null;
  return {
    kind: PNL_RESULT.READY,
    pnl: { ...pnl, distribution },
    rate: { value: '278', month: MONTH },
    currencies: { reporting: 'USD', display: 'PKR' },
    hasSplit: withSplit,
    fundedByPartnerId: { a: new Decimal(20) },
    closedAt: null,
  };
}

describe('closeMonth (PRD §5.6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findByMonth.mockResolvedValue(null);
    mocks.revenueDrafts.mockResolvedValue(0);
    mocks.expenseDrafts.mockResolvedValue(0);
    mocks.markClosed.mockResolvedValue({
      id: 'period-1',
      month: MONTH,
      status: PeriodStatus.CLOSED,
    });
    mocks.loadMonthlyPnl.mockResolvedValue(readyPnl(true));
  });

  it('stores a snapshot and posts each partner share, reserve and funding to the ledger', async () => {
    await closeMonth(ACTOR, MONTH);
    expect(mocks.markClosed).toHaveBeenCalledWith(
      MONTH,
      expect.objectContaining({
        closedById: ACTOR.id,
        snapshot: expect.objectContaining({ pnl: expect.anything() }),
      }),
    );
    const posted = mocks.createEntry.mock.calls.map(([entry]) => [
      entry.type,
      entry.amount,
      entry.periodId,
    ]);
    expect(posted).toEqual([
      [LedgerEntryType.PROFIT_SHARE, '1000', 'period-1'],
      [LedgerEntryType.RESERVE, '-50', 'period-1'],
      [LedgerEntryType.FUNDING_IN, '20', 'period-1'],
    ]);
    expect(mocks.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'CLOSE' }));
  });

  it('refuses while drafts are waiting to be confirmed', async () => {
    mocks.expenseDrafts.mockResolvedValue(2);
    await expect(closeMonth(ACTOR, MONTH)).rejects.toThrow(MESSAGES.PERIOD.DRAFTS_OPEN);
    expect(mocks.markClosed).not.toHaveBeenCalled();
  });

  it('refuses without a profit split for the month', async () => {
    mocks.loadMonthlyPnl.mockResolvedValue(readyPnl(false));
    await expect(closeMonth(ACTOR, MONTH)).rejects.toThrow(MESSAGES.PNL.NO_SPLIT);
  });

  it('refuses without an exchange rate', async () => {
    mocks.loadMonthlyPnl.mockResolvedValue({ kind: PNL_RESULT.MISSING_RATE });
    await expect(closeMonth(ACTOR, MONTH)).rejects.toThrow(MESSAGES.PNL.RATE_MISSING);
  });

  it('refuses a month that is already closed', async () => {
    mocks.findByMonth.mockResolvedValue({ id: 'period-1', status: PeriodStatus.CLOSED });
    await expect(closeMonth(ACTOR, MONTH)).rejects.toThrow(MESSAGES.PERIOD.ALREADY_CLOSED);
  });
});

describe('reopenMonth', () => {
  beforeEach(() => vi.clearAllMocks());

  it('removes what the close posted and records the reason', async () => {
    mocks.findByMonth.mockResolvedValue({ id: 'period-1', status: PeriodStatus.CLOSED });
    await reopenMonth(ACTOR, MONTH, 'Late invoice found');
    expect(mocks.softDeleteForPeriod).toHaveBeenCalledWith('period-1');
    expect(mocks.markReopened).toHaveBeenCalledWith(
      'period-1',
      expect.objectContaining({ reopenReason: 'Late invoice found', reopenedById: ACTOR.id }),
    );
    expect(mocks.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'REOPEN' }));
  });

  it('refuses a month that is not closed', async () => {
    mocks.findByMonth.mockResolvedValue(null);
    await expect(reopenMonth(ACTOR, MONTH, 'reason')).rejects.toThrow(MESSAGES.PERIOD.NOT_CLOSED);
  });
});
