import type { MonthKey } from '@/lib/month';
import type { ReportColumn } from '@/lib/report-period';
import {
  type ReceivableTotals,
  type RevenueLineFigures,
  summarizeReceivables,
} from '@/server/domain/revenue-math';
import { moneyRow, percentRow } from '@/server/reports/report-rows';
import { DRILL_FIGURE, ROW_TONE, type ReportSection } from '@/types/report';

export type BookedFigures = { month: MonthKey; figures: RevenueLineFigures };

export function receivablesByColumn(
  columns: readonly ReportColumn[],
  entries: readonly BookedFigures[],
): ReceivableTotals[] {
  return columns.map((column) =>
    summarizeReceivables(
      entries.filter((entry) => column.months.includes(entry.month)).map((entry) => entry.figures),
    ),
  );
}

/**
 * The Dashboard tab's "RECEIVABLES": booked (net), received, funded escrow, unfunded,
 * outstanding and collection rate, by the month the work was booked in.
 */
export function buildReceivablesSections(totals: readonly ReceivableTotals[]): ReportSection[] {
  const drill = { figure: DRILL_FIGURE.RECEIVABLES };
  return [
    {
      key: 'receivables',
      title: 'Receivables by booking month',
      note: 'Work booked in each period, with what has been received on it up to today.',
      rows: [
        moneyRow(
          'booked',
          'Total booked (net)',
          totals.map((total) => total.netBooked),
          { drill },
        ),
        moneyRow(
          'received',
          'Received',
          totals.map((total) => total.received),
          { drill },
        ),
        moneyRow(
          'escrow',
          'Funded escrow (safe)',
          totals.map((total) => total.fundedEscrow),
          {
            drill,
          },
        ),
        moneyRow(
          'unfunded',
          'Unfunded (at risk)',
          totals.map((total) => total.unfunded),
          {
            drill,
          },
        ),
        moneyRow(
          'written-off',
          'Written off or reduced',
          totals.map((total) => total.writtenOff),
          {
            tone: ROW_TONE.MUTED,
            drill,
          },
        ),
        moneyRow(
          'outstanding',
          'Outstanding',
          totals.map((total) => total.outstanding),
          {
            tone: ROW_TONE.SUBTOTAL,
            drill,
          },
        ),
        percentRow(
          'collection-rate',
          'Collection rate',
          totals.map((total) => total.collectionRate),
          {
            tone: ROW_TONE.MUTED,
          },
        ),
      ],
    },
  ];
}
