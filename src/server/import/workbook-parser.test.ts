import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { exceljsSpreadsheetReader } from '@/server/adapters/exceljs-spreadsheet-reader.adapter';
import { type ParsedMonth, parseWorkbook } from '@/server/import/workbook-parser';
import { WORKBOOK_MONTHS } from '@/server/domain/workbook-fixture';

const SAMPLE_WORKBOOK = path.resolve(
  import.meta.dirname,
  '../../../test-fixtures/reference-workbook.xlsx',
);
const PRECISION = 6;

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

describe('parseWorkbook on the anonymised reference workbook', () => {
  let months: ParsedMonth[] = [];

  beforeAll(async () => {
    const file = await readFile(SAMPLE_WORKBOOK);
    const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
    months = parseWorkbook(await exceljsSpreadsheetReader.read(buffer));
  });

  it('finds the twelve visible month tabs and skips the hidden old January', () => {
    expect(months.map((month) => month.tab)).toEqual(WORKBOOK_MONTHS.map((month) => month.tab));
    expect(months[0]?.month).toBe('2026-01');
  });

  it.each(WORKBOOK_MONTHS.map((expected) => [expected.tab, expected] as const))(
    '%s: revenue, expenses and rate match the extracted fixture',
    (tab, expected) => {
      const parsed = months.find((month) => month.tab === tab);
      expect(parsed).toBeDefined();
      expect(parsed?.rate).toBe(expected.rate);
      expect(sum(parsed?.revenue.map((line) => line.gross) ?? [])).toBeCloseTo(
        sum(expected.revenue.map((line) => line.gross)),
        PRECISION,
      );
      const parsedUsd =
        parsed?.expenses.filter((line) => line.inReportingCurrency).map((line) => line.amount) ??
        [];
      const parsedPkr =
        parsed?.expenses.filter((line) => !line.inReportingCurrency).map((line) => line.amount) ??
        [];
      const expectedUsd = expected.expenses
        .filter((line) => line.currency === 'USD')
        .map((line) => line.amount);
      const expectedPkr = expected.expenses
        .filter((line) => line.currency === 'PKR')
        .map((line) => line.amount);
      expect(sum(parsedUsd)).toBeCloseTo(sum(expectedUsd), PRECISION);
      expect(sum(parsedPkr)).toBeCloseTo(sum(expectedPkr), PRECISION);
      expect(parsed?.workbookTotals.netProfit).toBeCloseTo(
        expected.workbook.netProfitCompany ?? 0,
        PRECISION,
      );
    },
  );

  it('reads "Partner C Funding" as external funding by Partner C', () => {
    const january = months.find((month) => month.tab === 'Jan 2026');
    const external = january?.expenses.filter((line) => line.fundingPartnerName !== null) ?? [];
    expect(external.length).toBeGreaterThan(0);
    expect(new Set(external.map((line) => line.fundingPartnerName))).toEqual(
      new Set(['Partner C']),
    );
  });

  it('keeps a USD-typed line in USD (Mar 2026 Business Transaction Cost, 117 USD)', () => {
    const march = months.find((month) => month.tab === 'Mar 2026');
    const line = march?.expenses.find((expense) => expense.item === 'Business Transaction Cost');
    expect(line).toMatchObject({ amount: 117, inReportingCurrency: true });
  });
});

describe('parseWorkbook layout drift', () => {
  it('reads the client from column C when the header says Platform but D holds a number (Aug–Nov)', async () => {
    const file = await readFile(SAMPLE_WORKBOOK);
    const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
    const months = parseWorkbook(await exceljsSpreadsheetReader.read(buffer));
    const labels = months.flatMap((month) => month.revenue.map((line) => line.clientLabel));
    expect(labels.every((label) => /client/i.test(label))).toBe(true);
    const october = months.find((month) => month.tab === 'Oct 2026');
    expect(october?.revenue[0]).toMatchObject({
      clientLabel: 'Client G - Project 1',
      platformLabel: null,
    });
  });
});
