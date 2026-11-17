import ExcelJS from 'exceljs';

import type {
  CellValue,
  SheetGrid,
  SpreadsheetReader,
} from '@/server/ports/spreadsheet-reader.port';

const VISIBLE_STATE = 'visible';

/** Flattens exceljs's cell shapes (formula, rich text, hyperlink, date, error) to plain values. */
function toCellValue(raw: ExcelJS.CellValue): CellValue {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') return raw;
  if (raw instanceof Date) return raw.toISOString();
  if ('result' in raw) return toCellValue(raw.result ?? null);
  if ('richText' in raw) return raw.richText.map((part) => part.text).join('');
  if ('text' in raw && typeof raw.text === 'string') return raw.text;
  return null;
}

function formulaOf(raw: ExcelJS.CellValue): string | null {
  if (raw && typeof raw === 'object' && !(raw instanceof Date)) {
    if ('formula' in raw && typeof raw.formula === 'string') return raw.formula;
    if ('sharedFormula' in raw && typeof raw.sharedFormula === 'string') return raw.sharedFormula;
  }
  return null;
}

export const exceljsSpreadsheetReader: SpreadsheetReader = {
  async read(file) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file);
    return workbook.worksheets.map((worksheet): SheetGrid => ({
      name: worksheet.name,
      hidden: worksheet.state !== VISIBLE_STATE,
      rowCount: worksheet.rowCount,
      value: (address) => toCellValue(worksheet.getCell(address).value),
      formula: (address) => formulaOf(worksheet.getCell(address).value),
    }));
  },
};
