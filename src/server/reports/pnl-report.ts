import { FundingSource, type PnlLine } from '@/generated/prisma/enums';
import { ZERO } from '@/lib/decimal';
import { PNL_LINE_LABEL, PNL_LINE_ORDER } from '@/lib/labels';
import { type MonthKey, formatMonthLabel } from '@/lib/month';
import type { ReportColumn } from '@/lib/report-period';
import { type PnlTotals, sumPnls } from '@/server/domain/period-report';
import type { MonthlyPnl } from '@/server/domain/pnl';
import { hasFigures, moneyRow, percentRow } from '@/server/reports/report-rows';
import { DRILL_FIGURE, ROW_TONE, type ReportSection } from '@/types/report';

export type MonthlyPnls = ReadonlyMap<MonthKey, MonthlyPnl | null>;

export function totalsByColumn(
  columns: readonly ReportColumn[],
  monthly: MonthlyPnls,
): PnlTotals[] {
  return columns.map((column) =>
    sumPnls(column.months.map((month) => ({ month, pnl: monthly.get(month) ?? null }))),
  );
}

function lineValue(totals: PnlTotals, pnlLine: PnlLine, source: 'company' | 'external') {
  return totals.lines.find((line) => line.pnlLine === pnlLine)?.[source] ?? ZERO;
}

/** Months the period covers that could not be computed, named once for a warning. */
export function missingMonthsWarning(totals: readonly PnlTotals[]): string[] {
  const missing = [...new Set(totals.flatMap((total) => total.missingMonths))].sort();
  return missing.length === 0
    ? []
    : [
        `No exchange rate for ${missing.map((month) => formatMonthLabel(month as MonthKey)).join(', ')}, so those months are left out of the totals.`,
      ];
}

/**
 * PRD §5.7 P&L statement: gross revenue, platform fees, net revenue, each expense line,
 * total company expense, net profit (company), margin, externally funded costs, net profit
 * including external, margin — the rows of the workbook's Dashboard "P&L SUMMARY".
 */
export function buildPnlSections(totals: readonly PnlTotals[]): ReportSection[] {
  const adjustments = moneyRow(
    'adjustments',
    'Receivable write-offs and reductions',
    totals.map((total) => total.receivableAdjustments.negated()),
    { drill: { figure: DRILL_FIGURE.ADJUSTMENTS } },
  );
  const externalLines = PNL_LINE_ORDER.map((pnlLine) =>
    moneyRow(
      `external-${pnlLine}`,
      PNL_LINE_LABEL[pnlLine],
      totals.map((total) => lineValue(total, pnlLine, 'external')),
      { drill: { figure: DRILL_FIGURE.EXPENSES, line: pnlLine, funding: FundingSource.EXTERNAL } },
    ),
  ).filter(hasFigures);
  return [
    {
      key: 'revenue',
      title: 'Revenue',
      rows: [
        moneyRow(
          'gross',
          'Gross revenue (booked)',
          totals.map((total) => total.grossRevenue),
          {
            drill: { figure: DRILL_FIGURE.REVENUE },
          },
        ),
        moneyRow(
          'fees',
          'Platform fees',
          totals.map((total) => total.platformFees.negated()),
          { drill: { figure: DRILL_FIGURE.REVENUE } },
        ),
        ...(hasFigures(adjustments) ? [adjustments] : []),
        moneyRow(
          'net-revenue',
          'Net revenue',
          totals.map((total) => total.netRevenue),
          {
            tone: ROW_TONE.SUBTOTAL,
            drill: { figure: DRILL_FIGURE.REVENUE },
          },
        ),
      ],
    },
    {
      key: 'company-expense',
      title: 'Company expenses',
      rows: [
        ...PNL_LINE_ORDER.map((pnlLine) =>
          moneyRow(
            `company-${pnlLine}`,
            PNL_LINE_LABEL[pnlLine],
            totals.map((total) => lineValue(total, pnlLine, 'company')),
            {
              drill: {
                figure: DRILL_FIGURE.EXPENSES,
                line: pnlLine,
                funding: FundingSource.COMPANY,
              },
            },
          ),
        ),
        moneyRow(
          'total-company-expense',
          'Total company expense',
          totals.map((total) => total.totalCompanyExpense),
          {
            tone: ROW_TONE.SUBTOTAL,
            drill: { figure: DRILL_FIGURE.EXPENSES, funding: FundingSource.COMPANY },
          },
        ),
      ],
    },
    {
      key: 'profit',
      title: 'Profit',
      rows: [
        moneyRow(
          'net-profit',
          'Net profit (company)',
          totals.map((total) => total.netProfitCompany),
          {
            tone: ROW_TONE.TOTAL,
          },
        ),
        percentRow(
          'margin',
          'Margin',
          totals.map((total) => total.marginCompany),
          {
            tone: ROW_TONE.MUTED,
          },
        ),
      ],
    },
    {
      key: 'external',
      title: 'Externally funded',
      note: 'Paid by a partner, not by the company. Shown for the full picture; not in company profit.',
      rows: [
        ...externalLines,
        moneyRow(
          'total-external',
          'Total external funding',
          totals.map((total) => total.totalExternalFunding),
          {
            tone: ROW_TONE.SUBTOTAL,
            drill: { figure: DRILL_FIGURE.EXPENSES, funding: FundingSource.EXTERNAL },
          },
        ),
        moneyRow(
          'net-profit-incl',
          'Net profit including external',
          totals.map((total) => total.netProfitInclExternal),
          { tone: ROW_TONE.TOTAL },
        ),
        percentRow(
          'margin-incl',
          'Margin including external',
          totals.map((total) => total.marginInclExternal),
          {
            tone: ROW_TONE.MUTED,
          },
        ),
      ],
    },
  ];
}
