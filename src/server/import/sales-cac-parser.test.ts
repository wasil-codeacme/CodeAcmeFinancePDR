import { describe, expect, it } from 'vitest';

import { SalesChannel } from '@/generated/prisma/enums';
import { parseSalesCacSheet } from '@/server/import/sales-cac-parser';
import type { CellValue, SheetGrid } from '@/server/ports/spreadsheet-reader.port';

/** The layout of the reference workbook's "CodeAcme Sales CAC" sheet. */
const CELLS: Record<string, CellValue> = {
  B3: 'August',
  C3: 'September',
  D3: 'October',
  A4: 'Upwork Connects',
  B4: 120,
  A14: 'Number of interested response Upwork ',
  B14: 5,
  C14: 13,
  D14: 5,
  A15: 'Number of leads closed on Upwork',
  B15: 0,
  C15: 1,
  D15: 0,
  A17: 'Number of interested response Cold Email ',
  B17: 0,
  A18: 'Number of leads closed on Cold Email  ',
  E19: 'Total Calls Made',
  A20: 'Number of interested response Cold Call ',
  D20: 2,
  E20: 36,
  A21: 'Number of leads closed on Cold Call ',
};

const SHEET: SheetGrid = {
  name: 'CodeAcme Sales CAC',
  hidden: false,
  rowCount: 23,
  value: (address) => CELLS[address] ?? null,
  formula: () => null,
};

describe('parseSalesCacSheet', () => {
  const parsed = parseSalesCacSheet(SHEET, 2026);

  it('reads interested responses and leads closed per channel and month', () => {
    const upworkSeptember = parsed.activity.find(
      (entry) => entry.month === '2026-09' && entry.channel === SalesChannel.UPWORK,
    );
    expect(upworkSeptember).toMatchObject({ interestedResponses: 13, leadsClosed: 1 });
    expect(
      parsed.activity.find(
        (entry) => entry.month === '2026-10' && entry.channel === SalesChannel.COLD_CALL,
      ),
    ).toMatchObject({ interestedResponses: 2 });
  });

  it('puts the undated "Total Calls Made" on the last month and says so', () => {
    expect(
      parsed.activity.find(
        (entry) => entry.month === '2026-10' && entry.channel === SalesChannel.COLD_CALL,
      )?.callsMade,
    ).toBe(36);
    expect(parsed.warnings).toEqual([
      '"Total Calls Made" (36) has no month; it was put on Oct 2026.',
    ]);
  });

  it('skips channel-months with nothing in them', () => {
    expect(parsed.activity.some((entry) => entry.channel === SalesChannel.COLD_EMAIL)).toBe(false);
  });
});
