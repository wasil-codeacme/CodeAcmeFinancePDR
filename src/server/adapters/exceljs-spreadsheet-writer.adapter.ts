import ExcelJS from 'exceljs';

import {
  SHEET_CELL_FORMAT,
  type SheetCellFormat,
  type SheetData,
  type SpreadsheetWriter,
} from '@/server/ports/spreadsheet-writer.port';

const NUMBER_FORMAT: Partial<Record<SheetCellFormat, string>> = {
  [SHEET_CELL_FORMAT.MONEY]: '#,##0.00;[Red]-#,##0.00',
  [SHEET_CELL_FORMAT.PERCENT]: '0.0%',
  [SHEET_CELL_FORMAT.COUNT]: '#,##0',
};
const DEFAULT_WIDTH = 14;
/** Excel limits sheet names to 31 characters. */
const MAX_SHEET_NAME = 31;

export const exceljsSpreadsheetWriter: SpreadsheetWriter = {
  async write(sheets: readonly SheetData[]): Promise<Uint8Array<ArrayBuffer>> {
    const workbook = new ExcelJS.Workbook();
    for (const sheet of sheets) {
      const worksheet = workbook.addWorksheet(sheet.name.slice(0, MAX_SHEET_NAME));
      for (const row of sheet.rows) {
        const added = worksheet.addRow(row.map((cell) => cell.value));
        row.forEach((cell, index) => {
          const target = added.getCell(index + 1);
          const format = cell.format ? NUMBER_FORMAT[cell.format] : undefined;
          if (format) target.numFmt = format;
          if (cell.bold) target.font = { bold: true };
        });
      }
      const widestRow = Math.max(0, ...sheet.rows.map((row) => row.length));
      for (let index = 1; index <= widestRow; index += 1) {
        worksheet.getColumn(index).width = sheet.columnWidths?.[index - 1] ?? DEFAULT_WIDTH;
      }
    }
    return new Uint8Array(await workbook.xlsx.writeBuffer());
  },
};
