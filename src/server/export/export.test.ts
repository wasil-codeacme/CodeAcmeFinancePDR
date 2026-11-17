import { describe, expect, it } from 'vitest';

import { toCsv } from '@/server/export/csv';
import { reportToSheet } from '@/server/export/report-sheet';
import { SHEET_CELL_FORMAT } from '@/server/ports/spreadsheet-writer.port';
import { ROW_TONE, type ReportTable, VALUE_FORMAT } from '@/types/report';

const REPORT: ReportTable = {
  title: 'P&L statement',
  periodLabel: 'Q1 2026',
  currency: 'USD',
  columns: [
    { key: '2026-01', label: 'Jan', months: ['2026-01'], isTotal: false, param: '2026-01' },
    { key: 'total', label: 'Q1 2026', months: ['2026-01'], isTotal: true, param: '2026-q1' },
  ],
  sections: [
    {
      key: 'profit',
      title: 'Profit',
      rows: [
        {
          key: 'net-profit',
          label: 'Net profit (company)',
          format: VALUE_FORMAT.MONEY,
          tone: ROW_TONE.TOTAL,
          values: ['1200.5', '1200.5'],
        },
        {
          key: 'margin',
          label: 'Margin',
          format: VALUE_FORMAT.PERCENT,
          tone: ROW_TONE.MUTED,
          values: ['0.25', null],
        },
      ],
    },
  ],
  warnings: ['No exchange rate for Apr 2026.'],
};

describe('reportToSheet (exports match the screen)', () => {
  const sheet = reportToSheet(REPORT);
  const values = sheet.rows.map((row) => row.map((cell) => cell.value));

  it('heads the sheet with the report, its period and currency, then the column labels', () => {
    expect(values[0]).toEqual(['P&L statement']);
    expect(values[1]).toEqual(['Q1 2026', 'Amounts in USD']);
    expect(values).toContainEqual(['', 'Jan', 'Q1 2026']);
  });

  it('writes figures as numbers with a money or percent format, blanks as empty', () => {
    const profit = sheet.rows.find((row) => row[0]?.value === 'Net profit (company)');
    expect(profit?.[1]).toEqual({ value: 1200.5, format: SHEET_CELL_FORMAT.MONEY, bold: true });
    const margin = sheet.rows.find((row) => row[0]?.value === 'Margin');
    expect(margin?.[1]).toEqual({ value: 0.25, format: SHEET_CELL_FORMAT.PERCENT, bold: false });
    expect(margin?.[2]?.value).toBeNull();
  });

  it('carries the warnings so an export never hides a missing month', () => {
    expect(values.at(-1)).toEqual(['No exchange rate for Apr 2026.']);
  });
});

describe('toCsv', () => {
  it('quotes commas, quotes and line breaks', () => {
    expect(toCsv([[{ value: 'Client, Inc' }, { value: 'He said "hi"' }, { value: 'a\nb' }]])).toBe(
      '"Client, Inc","He said ""hi""","a\nb"\r\n',
    );
  });

  it('keeps numbers raw and neutralises text that a spreadsheet would run as a formula', () => {
    expect(toCsv([[{ value: -12.5 }, { value: '=HYPERLINK("x")' }, { value: null }]])).toBe(
      `-12.5,"'=HYPERLINK(""x"")",\r\n`,
    );
  });
});
