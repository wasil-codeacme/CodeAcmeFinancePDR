import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LedgerEntryType, Role } from '@/generated/prisma/enums';
import { MESSAGES } from '@/lib/messages';

const mocks = vi.hoisted(() => ({
  assertMonthsOpen: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  softDelete: vi.fn(),
  findPartner: vi.fn(),
  record: vi.fn(),
}));

vi.mock('@/server/period-guard', () => ({ assertMonthsOpen: mocks.assertMonthsOpen }));
vi.mock('@/server/repositories/ledger.repository', () => ({
  ledgerRepository: {
    create: mocks.create,
    findById: mocks.findById,
    softDelete: mocks.softDelete,
  },
}));
vi.mock('@/server/repositories/profit-sharing.repository', () => ({
  partnerRepository: { findById: mocks.findPartner },
}));
vi.mock('@/server/repositories/audit.repository', () => ({
  auditRepository: { record: mocks.record },
}));
vi.mock('@/server/repositories/db', () => ({
  runInTransaction: (work: () => Promise<unknown>) => work(),
}));

const { deleteLedgerEntry, recordFunding, recordWithdrawal } =
  await import('@/server/services/partner-ledger.service');

const ACTOR = { id: 'founder-1', email: 'a@example.test', name: 'A', role: Role.FOUNDER };

describe('partner ledger entries (PRD §5.6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findPartner.mockResolvedValue({ id: 'partner-1', name: 'Partner A', active: true });
    mocks.create.mockImplementation(async (data) => ({ id: 'entry-1', ...data }));
  });

  it('records a withdrawal as a negative entry in the month of its date', async () => {
    await recordWithdrawal(ACTOR, {
      partnerId: 'partner-1',
      occurredOn: '2026-03-15',
      amount: '250',
      accountId: 'wise',
      note: null,
    });
    expect(mocks.assertMonthsOpen).toHaveBeenCalledWith('2026-03');
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: LedgerEntryType.WITHDRAWAL,
        amount: '-250',
        month: '2026-03',
        accountId: 'wise',
        periodId: null,
      }),
    );
  });

  it('records partner funding as a positive entry', async () => {
    await recordFunding(ACTOR, {
      partnerId: 'partner-1',
      occurredOn: '2026-03-02',
      amount: '400',
      accountId: null,
      note: 'Paid Upwork connects personally',
    });
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: LedgerEntryType.FUNDING_IN, amount: '400', accountId: null }),
    );
  });

  it('will not delete an entry the month close posted', async () => {
    mocks.findById.mockResolvedValue({ id: 'entry-1', month: '2026-01', periodId: 'period-1' });
    await expect(deleteLedgerEntry(ACTOR, 'entry-1')).rejects.toThrow(
      MESSAGES.LEDGER.POSTED_BY_CLOSE,
    );
    expect(mocks.softDelete).not.toHaveBeenCalled();
  });

  it('deletes a manual entry in an open month', async () => {
    mocks.findById.mockResolvedValue({ id: 'entry-2', month: '2026-03', periodId: null });
    mocks.softDelete.mockResolvedValue({ id: 'entry-2' });
    await deleteLedgerEntry(ACTOR, 'entry-2');
    expect(mocks.assertMonthsOpen).toHaveBeenCalledWith('2026-03');
    expect(mocks.softDelete).toHaveBeenCalledWith('entry-2');
  });
});
