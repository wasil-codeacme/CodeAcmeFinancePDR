export type CellValue = string | number | boolean | null;

/** One worksheet, read-only: the cell's value (a formula's cached result) and its formula text. */
export type SheetGrid = {
  name: string;
  hidden: boolean;
  rowCount: number;
  value(address: string): CellValue;
  formula(address: string): string | null;
};

/** Reads an uploaded spreadsheet. Callers depend on this port, not on a parsing library. */
export interface SpreadsheetReader {
  read(file: ArrayBuffer): Promise<SheetGrid[]>;
}
