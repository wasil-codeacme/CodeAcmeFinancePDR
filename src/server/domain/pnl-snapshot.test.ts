import { describe, expect, it } from 'vitest';

import { convertCurrency } from '@/server/domain/currency';
import { computeMonthlyPnl } from '@/server/domain/pnl';
import {
  parseClosedPeriodSnapshot,
  parsePnlSnapshot,
  toClosedPeriodSnapshot,
  toPnlSnapshot,
} from '@/server/domain/pnl-snapshot';
import { WORKBOOK_MONTHS, workbookMonthToPnlInput } from '@/server/domain/workbook-fixture';
import { MissingExchangeRateError } from '@/server/errors';

const CURRENCIES = { reporting: 'USD', display: 'PKR' };

describe('pnl snapshot (closed months keep the figures they were closed with)', () => {
  const january = WORKBOOK_MONTHS.find((month) => month.tab === 'Jan 2026');
  if (!january) throw new Error('fixture missing Jan 2026');
  const pnl = computeMonthlyPnl(workbookMonthToPnlInput(january));

  it('round-trips through JSON without losing precision', () => {
    const stored: unknown = JSON.parse(JSON.stringify(toPnlSnapshot(pnl)));
    const restored = parsePnlSnapshot(stored);
    expect(restored?.netProfitCompany.toString()).toBe(pnl.netProfitCompany.toString());
    expect(restored?.distribution?.partners[0]?.takeHome.toString()).toBe(
      pnl.distribution?.partners[0]?.takeHome.toString(),
    );
    expect(restored?.expenseLines).toHaveLength(pnl.expenseLines.length);
    expect(restored?.marginCompany?.toString()).toBe(pnl.marginCompany?.toString());
  });

  it('rejects stored JSON that is not a snapshot', () => {
    expect(parsePnlSnapshot({ hello: 'world' })).toBeNull();
    expect(parsePnlSnapshot(null)).toBeNull();
  });
});

describe('convertCurrency', () => {
  it('converts between the reporting and display currency at the month rate', () => {
    expect(convertCurrency('100', 'USD', 'PKR', '278', CURRENCIES).toNumber()).toBe(27800);
    expect(convertCurrency('27800', 'PKR', 'USD', '278', CURRENCIES).toNumber()).toBe(100);
    expect(convertCurrency('50', 'USD', 'USD', null, CURRENCIES).toNumber()).toBe(50);
  });

  it('needs a rate to cross currencies', () => {
    expect(() => convertCurrency('100', 'USD', 'PKR', null, CURRENCIES)).toThrow(
      MissingExchangeRateError,
    );
  });
});

describe('closed period snapshot', () => {
  it('keeps the rate and currencies the month was closed with', () => {
    const january = WORKBOOK_MONTHS.find((month) => month.tab === 'Jan 2026');
    if (!january) throw new Error('fixture missing Jan 2026');
    const pnl = computeMonthlyPnl(workbookMonthToPnlInput(january));
    const stored: unknown = JSON.parse(
      JSON.stringify(
        toClosedPeriodSnapshot({
          pnl,
          rate: { value: '278', month: '2026-01' },
          currencies: CURRENCIES,
        }),
      ),
    );
    const restored = parseClosedPeriodSnapshot(stored);
    expect(restored?.rate).toEqual({ value: '278', month: '2026-01' });
    expect(restored?.pnl.netRevenue.toNumber()).toBe(1503);
    expect(parseClosedPeriodSnapshot({ pnl: {}, rate: null, currencies: CURRENCIES })).toBeNull();
  });
});
