export const SHEET_CELL_FORMAT = {
  TEXT: 'text',
  MONEY: 'money',
  PERCENT: 'percent',
  COUNT: 'count',
} as const;
export type SheetCellFormat = (typeof SHEET_CELL_FORMAT)[keyof typeof SHEET_CELL_FORMAT];

export type SheetCell = { value: string | number | null; format?: SheetCellFormat; bold?: boolean };

export type SheetData = { name: string; rows: SheetCell[][]; columnWidths?: number[] };

/** Writes workbooks for export. Callers depend on this port, not on a spreadsheet library. */
export interface SpreadsheetWriter {
  write(sheets: readonly SheetData[]): Promise<Uint8Array<ArrayBuffer>>;
}
