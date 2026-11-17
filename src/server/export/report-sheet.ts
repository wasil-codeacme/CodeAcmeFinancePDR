import {
  SHEET_CELL_FORMAT,
  type SheetCell,
  type SheetCellFormat,
  type SheetData,
} from '@/server/ports/spreadsheet-writer.port';
import {
  ROW_TONE,
  type ReportRow,
  type ReportTable,
  VALUE_FORMAT,
  type ValueFormat,
} from '@/types/report';

const LABEL_WIDTH = 40;
const VALUE_WIDTH = 14;

const FORMAT: Record<ValueFormat, SheetCellFormat> = {
  [VALUE_FORMAT.MONEY]: SHEET_CELL_FORMAT.MONEY,
  [VALUE_FORMAT.PERCENT]: SHEET_CELL_FORMAT.PERCENT,
  [VALUE_FORMAT.COUNT]: SHEET_CELL_FORMAT.COUNT,
};

const text = (value: string, bold = false): SheetCell => ({ value, bold });

function rowCells(row: ReportRow): SheetCell[] {
  const bold = row.tone === ROW_TONE.TOTAL || row.tone === ROW_TONE.SUBTOTAL;
  const label = row.currency ? `${row.label} (${row.currency})` : row.label;
  return [
    text(label, bold),
    ...row.values.map((value) => ({
      value: value === null ? null : Number(value),
      format: FORMAT[row.format],
      bold,
    })),
  ];
}

/** One report as one sheet: the same rows and figures as on screen, as real numbers. */
export function reportToSheet(report: ReportTable): SheetData {
  const rows: SheetCell[][] = [
    [text(report.title, true)],
    [text(report.periodLabel), text(`Amounts in ${report.currency}`)],
    [],
    [text(''), ...report.columns.map((column) => text(column.label, true))],
  ];
  for (const section of report.sections) {
    rows.push([], [text(section.title, true)]);
    for (const row of section.rows) rows.push(rowCells(row));
  }
  if (report.warnings.length > 0) {
    rows.push([]);
    for (const warning of report.warnings) rows.push([text(warning)]);
  }
  return {
    name: report.title,
    rows,
    columnWidths: [LABEL_WIDTH, ...report.columns.map(() => VALUE_WIDTH)],
  };
}
