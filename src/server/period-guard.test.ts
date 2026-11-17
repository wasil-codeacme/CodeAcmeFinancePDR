import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ closedAmong: vi.fn() }));
vi.mock('@/server/repositories/period.repository', () => ({
  periodRepository: { closedAmong: mocks.closedAmong },
}));

const { assertMonthsOpen, isMonthClosed } = await import('@/server/period-guard');

describe('period guard (PRD §5.6: a closed month is read-only)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lets writes into open months through', async () => {
    mocks.closedAmong.mockResolvedValue([]);
    await expect(assertMonthsOpen('2026-03', '2026-04')).resolves.toBeUndefined();
    expect(mocks.closedAmong).toHaveBeenCalledWith(['2026-03', '2026-04']);
  });

  it('refuses a write into a closed month and names it', async () => {
    mocks.closedAmong.mockResolvedValue(['2026-03']);
    await expect(assertMonthsOpen('2026-03')).rejects.toThrow(/Mar 2026/);
  });

  it('checks each distinct month once', async () => {
    mocks.closedAmong.mockResolvedValue([]);
    await assertMonthsOpen('2026-03', '2026-03');
    expect(mocks.closedAmong).toHaveBeenCalledWith(['2026-03']);
  });

  it('reports whether a single month is closed', async () => {
    mocks.closedAmong.mockResolvedValue(['2026-01']);
    await expect(isMonthClosed('2026-01')).resolves.toBe(true);
  });
});
