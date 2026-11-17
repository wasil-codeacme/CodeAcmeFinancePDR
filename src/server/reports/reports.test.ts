import { describe, expect, it } from 'vitest';

import { Decimal, sumDecimals } from '@/lib/decimal';
import type { MonthKey } from '@/lib/month';
import { displayColumns, exportColumns, parseReportPeriod } from '@/lib/report-period';
import type { CashMonth } from '@/server/domain/cash-position';
import { computeMonthlyPnl } from '@/server/domain/pnl';
import { computeRevenueLine } from '@/server/domain/revenue-math';
import { WORKBOOK_MONTHS, workbookMonthToPnlInput } from '@/server/domain/workbook-fixture';
import { buildCashSections } from '@/server/reports/cash-report';
import { buildDistributionSections } from '@/server/reports/distribution-report';
import {
  buildPnlSections,
  missingMonthsWarning,
  totalsByColumn,
} from '@/server/reports/pnl-report';
import { buildReceivablesSections, receivablesByColumn } from '@/server/reports/receivables-report';
import type { ReportSection } from '@/types/report';

const NOW = new Date('2026-12-31T00:00:00Z');
const YEAR = parseReportPeriod('2026', NOW);
const MONTHLY = new Map(
  WORKBOOK_MONTHS.map((tab, index) => [
    `2026-${String(index + 1).padStart(2, '0')}` as MonthKey,
    computeMonthlyPnl(workbookMonthToPnlInput(tab)),
  ]),
);

function rowValues(sections: readonly ReportSection[], key: string) {
  const row = sections
    .flatMap((section) => section.rows)
    .find((candidate) => candidate.key === key);
  if (!row) throw new Error(`no row ${key}`);
  return row.values;
}

describe('P&L report (every Dashboard tab figure by month, quarter and year)', () => {
  const columns = exportColumns(YEAR, NOW);
  const sections = buildPnlSections(totalsByColumn(columns, MONTHLY));

  it('gives each month the month tab figure, and the year the sum of the twelve', () => {
    const netProfit = rowValues(sections, 'net-profit');
    const monthly = [...MONTHLY.values()].map((pnl) => pnl.netProfitCompany);
    expect(netProfit[0]).toBe(monthly[0]?.toString());
    expect(new Decimal(netProfit.at(-1) ?? 0).toFixed(6)).toBe(sumDecimals(monthly).toFixed(6));
  });

  it('gives each quarter the sum of its three months', () => {
    const quarterIndex = columns.findIndex((column) => column.key === 'q1');
    const gross = rowValues(sections, 'gross');
    const expected = sumDecimals([...MONTHLY.values()].slice(0, 3).map((pnl) => pnl.grossRevenue));
    expect(new Decimal(gross[quarterIndex] ?? 0).toFixed(6)).toBe(expected.toFixed(6));
  });

  it('shows fees as a deduction and hides write-offs when there are none', () => {
    expect(Number(rowValues(sections, 'fees')[0])).toBeLessThan(0);
    expect(
      sections.flatMap((section) => section.rows).some((row) => row.key === 'adjustments'),
    ).toBe(false);
  });

  it('points each expense figure at the entries behind it', () => {
    const row = sections
      .flatMap((section) => section.rows)
      .find((candidate) => candidate.key === 'total-company-expense');
    expect(row?.drill).toEqual({ figure: 'expenses', funding: 'COMPANY' });
  });

  it('warns about months left out for want of a rate', () => {
    const withGap = new Map(MONTHLY);
    withGap.set('2026-04', null as never);
    expect(missingMonthsWarning(totalsByColumn(columns, withGap))).toEqual([
      'No exchange rate for Apr 2026, so those months are left out of the totals.',
    ]);
  });
});

describe('distribution report', () => {
  it('runs cumulative reserves to the end of each column', () => {
    const columns = displayColumns(YEAR, NOW);
    const reservesByMonth = new Map(
      [...MONTHLY.entries()].map(([month, pnl]) => [
        month,
        pnl.distribution?.totalReserves ?? new Decimal(0),
      ]),
    );
    const sections = buildDistributionSections({
      columns,
      monthly: MONTHLY,
      reservesByMonth,
      displayCurrency: 'PKR',
    });
    const cumulative = rowValues(sections, 'cumulative-reserves');
    const total = rowValues(sections, 'total-reserves');
    expect(cumulative.at(-1)).toBe(total.at(-1));
    expect(new Decimal(cumulative[1] ?? 0).toFixed(6)).toBe(
      new Decimal(total[0] ?? 0).plus(total[1] ?? 0).toFixed(6),
    );
    expect(sections.map((section) => section.title)).toContain('Partner A');
  });
});

describe('receivables report', () => {
  it('groups booked work by the month it was booked in', () => {
    const columns = displayColumns(parseReportPeriod('2026-q1', NOW), NOW);
    const line = (gross: string, received: string) =>
      computeRevenueLine({
        gross,
        feePercent: '10',
        receipts: [{ amount: received, isEscrow: false }],
        adjustments: [],
      });
    const totals = receivablesByColumn(columns, [
      { month: '2026-01', figures: line('1000', '900') },
      { month: '2026-02', figures: line('500', '0') },
      { month: '2026-05', figures: line('999', '0') },
    ]);
    const sections = buildReceivablesSections(totals);
    expect(rowValues(sections, 'booked').at(-1)).toBe('1350');
    expect(rowValues(sections, 'outstanding')).toEqual(['0', '450', '0', '450']);
    expect(rowValues(sections, 'collection-rate').at(-1)).toBe(
      new Decimal(900).dividedBy(1350).toString(),
    );
  });
});

describe('cash report', () => {
  const month = (key: MonthKey, cash: number, received: number): CashMonth => ({
    month: key,
    received: new Decimal(received),
    fundingIn: new Decimal(0),
    paidOut: new Decimal(100),
    withdrawals: new Decimal(50),
    transfersNet: new Decimal(0),
    accounts: [{ accountId: 'wise', name: 'Wise', closing: new Decimal(cash) }],
    companyCash: new Decimal(cash),
    expectedCash: new Decimal(cash),
    difference: null,
  });
  const cash = new Map<MonthKey, CashMonth | null>([
    ['2025-12', month('2025-12', 400, 0)],
    ['2026-01', month('2026-01', 500, 250)],
    ['2026-02', month('2026-02', 650, 300)],
    ['2026-03', month('2026-03', 800, 300)],
  ]);
  const columns = displayColumns(parseReportPeriod('2026-q1', NOW), NOW);

  it('adds flows over a column but takes balances at its end', () => {
    const sections = buildCashSections({
      columns,
      cash,
      accounts: [{ accountId: 'wise', name: 'Wise' }],
      showPartnerMovements: true,
    });
    expect(rowValues(sections, 'received').at(-1)).toBe('850');
    expect(rowValues(sections, 'company-cash').at(-1)).toBe('800');
    expect(rowValues(sections, 'opening')).toEqual(['400', '500', '650', '400']);
  });

  it('folds partner withdrawals into one line for anyone who may not see them', () => {
    const sections = buildCashSections({
      columns,
      cash,
      accounts: [],
      showPartnerMovements: false,
    });
    const keys = sections.flatMap((section) => section.rows).map((row) => row.key);
    expect(keys).not.toContain('withdrawals');
    expect(keys).toContain('partner-movements');
  });
});
