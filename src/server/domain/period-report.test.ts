import { describe, expect, it } from 'vitest';

import { PnlLine } from '@/generated/prisma/enums';
import { Decimal, sumDecimals } from '@/lib/decimal';
import type { MonthKey } from '@/lib/month';
import { cumulativeThrough, sumDistributions, sumPnls } from '@/server/domain/period-report';
import { type MonthlyPnl, computeMonthlyPnl } from '@/server/domain/pnl';
import { WORKBOOK_MONTHS, workbookMonthToPnlInput } from '@/server/domain/workbook-fixture';

const MONTHLY: { month: MonthKey; pnl: MonthlyPnl }[] = WORKBOOK_MONTHS.map((tab, index) => ({
  month: `2026-${String(index + 1).padStart(2, '0')}`,
  pnl: computeMonthlyPnl(workbookMonthToPnlInput(tab)),
}));

const firstQuarter = MONTHLY.slice(0, 3);

describe('sumPnls (Dashboard tab: quarter and YTD columns)', () => {
  it('adds every P&L figure across the months of the period', () => {
    const quarter = sumPnls(firstQuarter);
    const expected = sumDecimals(firstQuarter.map(({ pnl }) => pnl.netProfitCompany));
    expect(quarter.netProfitCompany.toFixed(6)).toBe(expected.toFixed(6));
    expect(quarter.grossRevenue.toFixed(2)).toBe(
      sumDecimals(firstQuarter.map(({ pnl }) => pnl.grossRevenue)).toFixed(2),
    );
    expect(quarter.months).toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('works out margin from the totals, not as an average of monthly margins', () => {
    const year = sumPnls(MONTHLY);
    expect(year.marginCompany?.toFixed(6)).toBe(
      year.netProfitCompany.dividedBy(year.netRevenue).toFixed(6),
    );
  });

  it('keeps each P&L line split into company and external funding', () => {
    const quarter = sumPnls(firstQuarter);
    const sales = quarter.lines.find((line) => line.pnlLine === PnlLine.SALES_SALARIES);
    const expected = sumDecimals(
      firstQuarter.map(
        ({ pnl }) =>
          pnl.expenseLines.find((line) => line.pnlLine === PnlLine.SALES_SALARIES)?.external ??
          new Decimal(0),
      ),
    );
    expect(sales?.external.toFixed(6)).toBe(expected.toFixed(6));
    expect(quarter.totalCompanyExpense.toFixed(6)).toBe(
      sumDecimals(quarter.lines.map((line) => line.company)).toFixed(6),
    );
  });

  it('flags months it could not include (no exchange rate) instead of hiding them', () => {
    const totals = sumPnls([...firstQuarter, { month: '2026-04', pnl: null }]);
    expect(totals.missingMonths).toEqual(['2026-04']);
    expect(totals.months).toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('leaves margin blank when there is no revenue', () => {
    expect(sumPnls([]).marginCompany).toBeNull();
  });
});

describe('sumDistributions (partner distribution by month and YTD)', () => {
  it('adds each partner share, reserve and take-home across months', () => {
    const totals = sumDistributions(firstQuarter.map(({ pnl }) => pnl.distribution));
    const partnerA = totals?.partners.find((partner) => partner.partnerName === 'Partner A');
    const expected = sumDecimals(
      firstQuarter.map(
        ({ pnl }) =>
          pnl.distribution?.partners.find((partner) => partner.partnerName === 'Partner A')
            ?.takeHome ?? new Decimal(0),
      ),
    );
    expect(partnerA?.takeHome.toFixed(6)).toBe(expected.toFixed(6));
    expect(totals?.partners.map((partner) => partner.partnerName)).toEqual([
      'Partner A',
      'Partner B',
      'Partner C',
    ]);
  });

  it('is empty when no month in the period has a distribution', () => {
    expect(sumDistributions([null, null])).toBeNull();
  });
});

describe('cumulativeThrough (cumulative reserves)', () => {
  it('runs a sum of monthly values up to and including a month', () => {
    const reserves = new Map<MonthKey, Decimal>([
      ['2026-01', new Decimal(10)],
      ['2026-02', new Decimal(20)],
      ['2026-03', new Decimal(5)],
    ]);
    expect(cumulativeThrough(reserves, '2026-02').toNumber()).toBe(30);
    expect(cumulativeThrough(reserves, '2026-12').toNumber()).toBe(35);
  });
});
