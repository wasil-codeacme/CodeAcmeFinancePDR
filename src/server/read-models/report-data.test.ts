import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RevenueKind } from '@/generated/prisma/enums';
import { loadBookedEntries, loadBookedFigures } from '@/server/read-models/report-data';

const mocks = vi.hoisted(() => ({
  listConfirmed: vi.fn(),
  listConfirmedBookedForMonths: vi.fn(),
}));

vi.mock('@/server/repositories/revenue.repository', () => ({
  revenueRepository: {
    listConfirmed: mocks.listConfirmed,
    listConfirmedBookedForMonths: mocks.listConfirmedBookedForMonths,
  },
}));
vi.mock('@/server/read-models/monthly-pnl', () => ({ PNL_RESULT: {}, readPnlRange: vi.fn() }));

const entry = (id: string, kind: string, bookingMonth: string) => ({
  id,
  kind,
  bookingMonth,
  gross: '100',
  feePercent: '10',
  receipts: [],
  adjustments: [],
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listConfirmedBookedForMonths.mockResolvedValue([entry('a', RevenueKind.BOOKED, '2026-03')]);
  mocks.listConfirmed.mockResolvedValue([
    entry('a', RevenueKind.BOOKED, '2026-03'),
    entry('s', RevenueKind.STANDALONE, '2026-01'),
  ]);
});

describe('report data loads only the months it shows', () => {
  it('asks the database for the period, not every entry', async () => {
    const figures = await loadBookedFigures(['2026-03']);
    expect(mocks.listConfirmedBookedForMonths).toHaveBeenCalledWith(['2026-03']);
    expect(mocks.listConfirmed).not.toHaveBeenCalled();
    expect(figures.map((figure) => figure.month)).toEqual(['2026-03']);
  });

  it('reads every booked entry for the dashboard, whose receivables span all months', async () => {
    const figures = await loadBookedFigures(null);
    expect(mocks.listConfirmed).toHaveBeenCalled();
    expect(figures).toHaveLength(1);
  });

  it('loads chart entries for the period only', async () => {
    await loadBookedEntries(['2026-01', '2026-02']);
    expect(mocks.listConfirmedBookedForMonths).toHaveBeenCalledWith(['2026-01', '2026-02']);
  });
});
