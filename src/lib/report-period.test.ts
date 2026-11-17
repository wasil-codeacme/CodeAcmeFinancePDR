import { describe, expect, it } from 'vitest';

import {
  PERIOD_KIND,
  displayColumns,
  exportColumns,
  formatPeriodLabel,
  parseReportPeriod,
  periodMonths,
  shiftPeriod,
  toPeriodParam,
  withKind,
} from '@/lib/report-period';

const NOW = new Date('2026-11-17T10:00:00Z');

describe('parseReportPeriod (PRD §5.7 period switcher)', () => {
  it('reads a month, a quarter, year to date and a full year from one URL value', () => {
    expect(parseReportPeriod('2026-03', NOW)).toEqual({
      kind: PERIOD_KIND.MONTH,
      year: 2026,
      month: '2026-03',
    });
    expect(parseReportPeriod('2026-q2', NOW)).toEqual({
      kind: PERIOD_KIND.QUARTER,
      year: 2026,
      quarter: 2,
    });
    expect(parseReportPeriod('2026-ytd', NOW)).toEqual({ kind: PERIOD_KIND.YTD, year: 2026 });
    expect(parseReportPeriod('2025', NOW)).toEqual({ kind: PERIOD_KIND.YEAR, year: 2025 });
  });

  it('falls back to this year to date for anything it cannot read', () => {
    for (const value of [undefined, '', 'nonsense', '2026-q5', '2026-13', ['2026-03']]) {
      expect(parseReportPeriod(value, NOW)).toEqual({ kind: PERIOD_KIND.YTD, year: 2026 });
    }
  });

  it('round-trips through the URL value', () => {
    for (const value of ['2026-03', '2026-q2', '2026-ytd', '2025']) {
      expect(toPeriodParam(parseReportPeriod(value, NOW))).toBe(value);
    }
  });
});

describe('periodMonths', () => {
  it('lists the months each period covers', () => {
    expect(periodMonths(parseReportPeriod('2026-03', NOW), NOW)).toEqual(['2026-03']);
    expect(periodMonths(parseReportPeriod('2026-q2', NOW), NOW)).toEqual([
      '2026-04',
      '2026-05',
      '2026-06',
    ]);
    expect(periodMonths(parseReportPeriod('2025', NOW), NOW)).toHaveLength(12);
  });

  it('stops year to date at the current month, and treats a past year to date as the full year', () => {
    expect(periodMonths(parseReportPeriod('2026-ytd', NOW), NOW).at(-1)).toBe('2026-11');
    expect(periodMonths(parseReportPeriod('2026-ytd', NOW), NOW)).toHaveLength(11);
    expect(periodMonths(parseReportPeriod('2025-ytd', NOW), NOW)).toHaveLength(12);
  });
});

describe('columns', () => {
  it('shows each month of a short period, plus the quarter total', () => {
    const columns = displayColumns(parseReportPeriod('2026-q1', NOW), NOW);
    expect(columns.map((column) => column.label)).toEqual(['Jan', 'Feb', 'Mar', 'Q1 2026']);
    expect(columns.at(-1)?.months).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(columns.at(-1)?.isTotal).toBe(true);
  });

  it('shows a single month as one column', () => {
    const columns = displayColumns(parseReportPeriod('2026-03', NOW), NOW);
    expect(columns).toEqual([
      { key: '2026-03', label: 'Mar 2026', months: ['2026-03'], isTotal: true, param: '2026-03' },
    ]);
  });

  it('shows a year by quarter so the table fits without scrolling sideways', () => {
    const columns = displayColumns(parseReportPeriod('2026-ytd', NOW), NOW);
    expect(columns.map((column) => column.label)).toEqual(['Q1', 'Q2', 'Q3', 'Q4', '2026 YTD']);
    expect(columns[3]?.months).toEqual(['2026-10', '2026-11']);
    expect(columns.map((column) => column.param)).toEqual([
      '2026-q1',
      '2026-q2',
      '2026-q3',
      '2026-q4',
      '2026-ytd',
    ]);
  });

  it('exports every month with quarter and year totals, like the workbook', () => {
    const labels = exportColumns(parseReportPeriod('2026', NOW), NOW).map((column) => column.label);
    expect(labels).toHaveLength(12 + 4 + 1);
    expect(labels.slice(0, 5)).toEqual(['Jan', 'Feb', 'Mar', 'Q1', 'Apr']);
    expect(labels.at(-1)).toBe('2026');
  });
});

describe('labels and navigation', () => {
  it('names each period', () => {
    expect(formatPeriodLabel(parseReportPeriod('2026-03', NOW), NOW)).toBe('Mar 2026');
    expect(formatPeriodLabel(parseReportPeriod('2026-q2', NOW), NOW)).toBe('Q2 2026');
    expect(formatPeriodLabel(parseReportPeriod('2026-ytd', NOW), NOW)).toBe(
      '2026 to date (Jan–Nov)',
    );
    expect(formatPeriodLabel(parseReportPeriod('2025', NOW), NOW)).toBe('2025');
  });

  it('steps to the previous or next period of the same kind', () => {
    expect(toPeriodParam(shiftPeriod(parseReportPeriod('2026-01', NOW), -1))).toBe('2025-12');
    expect(toPeriodParam(shiftPeriod(parseReportPeriod('2026-q4', NOW), 1))).toBe('2027-q1');
    expect(toPeriodParam(shiftPeriod(parseReportPeriod('2026-ytd', NOW), -1))).toBe('2025-ytd');
  });

  it('switches kind while keeping the point in time', () => {
    const march = parseReportPeriod('2026-03', NOW);
    expect(toPeriodParam(withKind(march, PERIOD_KIND.QUARTER, NOW))).toBe('2026-q1');
    expect(toPeriodParam(withKind(march, PERIOD_KIND.YEAR, NOW))).toBe('2026');
    expect(
      toPeriodParam(withKind(parseReportPeriod('2026-ytd', NOW), PERIOD_KIND.MONTH, NOW)),
    ).toBe('2026-11');
    expect(toPeriodParam(withKind(parseReportPeriod('2025', NOW), PERIOD_KIND.QUARTER, NOW))).toBe(
      '2025-q4',
    );
  });
});
