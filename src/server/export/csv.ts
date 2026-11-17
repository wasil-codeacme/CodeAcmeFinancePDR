import type { SheetCell } from '@/server/ports/spreadsheet-writer.port';

const LINE_END = '\r\n';
const NEEDS_QUOTES = /[",\r\n]/;
/** Text starting like a formula is run by Excel on open (CSV injection); prefix it with '. */
const FORMULA_START = /^[=+\-@\t\r]/;

function csvCell(cell: SheetCell): string {
  if (cell.value === null) return '';
  if (typeof cell.value === 'number') return String(cell.value);
  const text = FORMULA_START.test(cell.value) ? `'${cell.value}` : cell.value;
  return NEEDS_QUOTES.test(text) || text !== cell.value ? `"${text.replaceAll('"', '""')}"` : text;
}

/** RFC 4180 CSV with CRLF line ends, which Excel and Google Sheets both open cleanly. */
export function toCsv(rows: readonly (readonly SheetCell[])[]): string {
  return rows.map((row) => row.map(csvCell).join(',') + LINE_END).join('');
}
