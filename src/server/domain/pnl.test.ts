import { describe, expect, it } from 'vitest';

import { FundingSource, PnlLine } from '@/generated/prisma/enums';
import { computeMonthlyPnl, type MonthlyPnlInput } from '@/server/domain/pnl';
import { WORKBOOK_MONTHS, workbookMonthToPnlInput } from '@/server/domain/workbook-fixture';
import { reconcileWorkbook } from '@/server/domain/workbook-reconciliation';

const CATEGORY_ID = 'ops';

function baseInput(overrides: Partial<MonthlyPnlInput> = {}): MonthlyPnlInput {
  return {
    revenueLines: [{ gross: '1000', feePercent: '10' }],
    adjustmentAmounts: [],
    expenseLines: [],
    categories: [
      { id: CATEGORY_ID, name: 'Ops', pnlLine: PnlLine.OPERATIONS_OVERHEAD, sortOrder: 1 },
    ],
    currencies: { reporting: 'USD', display: 'PKR' },
    rate: '278',
    shares: [
      { partnerId: 'a', partnerName: 'A', splitPercent: '60' },
      { partnerId: 'b', partnerName: 'B', splitPercent: '40' },
    ],
    reserveRule: { enabled: true, reservePercent: '5', appliesInLossMonth: false },
    ...overrides,
  };
}

describe('computeMonthlyPnl against the reference workbook (PRD §8 step 1 acceptance)', () => {
  it.each(reconcileWorkbook().map((row) => [`${row.tab} · ${row.metric}`, row] as const))(
    '%s matches the workbook or differs by documented design',
    (_label, row) => {
      expect(row.matches || row.expectedDeviation).toBe(true);
    },
  );

  it('reproduces Jan 2026 to Excel precision', () => {
    const january = WORKBOOK_MONTHS.find((month) => month.tab === 'Jan 2026');
    if (!january) throw new Error('fixture missing Jan 2026');
    const pnl = computeMonthlyPnl(workbookMonthToPnlInput(january));
    expect(pnl.netRevenue.toNumber()).toBe(1503);
    expect(pnl.totalCompanyExpense.toNumber()).toBeCloseTo(537.237410071942, 9);
    expect(pnl.netProfitCompany.toNumber()).toBeCloseTo(965.762589928058, 9);
    expect(pnl.distribution?.partners[0]?.takeHome.toNumber()).toBeCloseTo(289.728776978417, 9);
    expect(pnl.distribution?.partners[0]?.takeHomeDisplay?.toNumber()).toBeCloseTo(80544.6, 6);
  });
});

describe('computeMonthlyPnl rules', () => {
  it('excludes externally funded costs from company profit but not from profit incl. external', () => {
    const pnl = computeMonthlyPnl(
      baseInput({
        expenseLines: [
          {
            amount: '100',
            currency: 'USD',
            fundingSource: FundingSource.COMPANY,
            categoryId: CATEGORY_ID,
          },
          {
            amount: '27800',
            currency: 'PKR',
            fundingSource: FundingSource.EXTERNAL,
            categoryId: CATEGORY_ID,
          },
        ],
      }),
    );
    expect(pnl.netRevenue.toNumber()).toBe(900);
    expect(pnl.totalCompanyExpense.toNumber()).toBe(100);
    expect(pnl.totalExternalFunding.toNumber()).toBe(100);
    expect(pnl.netProfitCompany.toNumber()).toBe(800);
    expect(pnl.netProfitInclExternal.toNumber()).toBe(700);
  });

  it('reduces net revenue by receivable adjustments posted to the month', () => {
    const pnl = computeMonthlyPnl(baseInput({ adjustmentAmounts: ['50'] }));
    expect(pnl.netRevenueBooked.toNumber()).toBe(900);
    expect(pnl.netRevenue.toNumber()).toBe(850);
  });

  it('leaves margin blank when there is no revenue', () => {
    const pnl = computeMonthlyPnl(baseInput({ revenueLines: [] }));
    expect(pnl.marginCompany).toBeNull();
  });

  it('takes the reserve from total distributable profit, per partner', () => {
    const pnl = computeMonthlyPnl(baseInput());
    const [first, second] = pnl.distribution?.partners ?? [];
    expect(first?.baselineShare.toNumber()).toBe(540);
    expect(first?.reserve.toNumber()).toBe(45);
    expect(first?.takeHome.toNumber()).toBe(495);
    expect(second?.reserve.toNumber()).toBe(45);
    expect(pnl.distribution?.totalReserves.toNumber()).toBe(90);
  });

  it('skips the reserve in a loss month unless the rule says it applies', () => {
    const lossInput = baseInput({
      expenseLines: [
        {
          amount: '1900',
          currency: 'USD',
          fundingSource: FundingSource.COMPANY,
          categoryId: CATEGORY_ID,
        },
      ],
    });
    expect(computeMonthlyPnl(lossInput).distribution?.totalReserves.toNumber()).toBe(0);
    const appliesInLoss = computeMonthlyPnl({
      ...lossInput,
      reserveRule: { enabled: true, reservePercent: '5', appliesInLossMonth: true },
    });
    expect(appliesInLoss.distribution?.totalReserves.toNumber()).toBe(-100);
  });

  it('has no distribution when no split applies to the month', () => {
    expect(computeMonthlyPnl(baseInput({ shares: null })).distribution).toBeNull();
  });

  it('throws when a PKR expense has no exchange rate', () => {
    const input = baseInput({
      rate: null,
      expenseLines: [
        {
          amount: '100',
          currency: 'PKR',
          fundingSource: FundingSource.COMPANY,
          categoryId: CATEGORY_ID,
        },
      ],
    });
    expect(() => computeMonthlyPnl(input)).toThrow();
  });
});
