import { formatMoney } from '@/lib/format';
import {
  KNOWN_WORKBOOK_DEVIATIONS,
  type ReconciliationRow,
  reconcileWorkbook,
} from '@/server/domain/workbook-reconciliation';

function resultLabel(row: ReconciliationRow): string {
  if (row.matches) return 'Match';
  return row.expectedDeviation ? 'Differs by design' : 'MISMATCH';
}

/** Prints app-vs-workbook figures for every month tab as a Markdown table. */
function main(): void {
  const rows = reconcileWorkbook();
  const lines = [
    '| Month | Figure | Workbook | App | Result |',
    '| --- | --- | ---: | ---: | --- |',
  ];
  for (const row of rows) {
    lines.push(
      `| ${row.tab} | ${row.metric} | ${formatMoney(row.workbook)} | ${formatMoney(row.app)} | ${resultLabel(row)} |`,
    );
  }
  const unexpected = rows.filter((row) => !row.matches && !row.expectedDeviation);
  lines.push('', `${rows.length} figures checked, ${unexpected.length} unexpected mismatches.`, '');
  for (const [tab, deviation] of Object.entries(KNOWN_WORKBOOK_DEVIATIONS)) {
    lines.push(`- ${tab}: ${deviation.reason}`);
  }
  process.stdout.write(`${lines.join('\n')}\n`);
  if (unexpected.length > 0) process.exitCode = 1;
}

main();
