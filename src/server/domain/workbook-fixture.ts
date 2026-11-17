import { FundingSource, PnlLine } from '@/generated/prisma/enums';
import type { MonthlyPnlInput, PnlCategory } from '@/server/domain/pnl';
import workbook from '@/server/domain/reference-workbook.fixture.json';

/**
 * Turns a month tab of the anonymised reference workbook (CodeAcme_Finance_Sample_Anonymized.xlsx,
 * extracted to JSON) into the app's P&L input, using the workbook's own settings:
 * a 35/35/30 split, a 5% reserve per partner that also applies in loss months, 278 PKR/USD.
 */
export type WorkbookMonth = (typeof workbook.months)[number];

export const WORKBOOK_MONTHS: readonly WorkbookMonth[] = workbook.months;

export const WORKBOOK_PARTNERS = ['Partner A', 'Partner B', 'Partner C'] as const;

const WORKBOOK_SPLIT_PERCENT: Record<(typeof WORKBOOK_PARTNERS)[number], string> = {
  'Partner A': '35',
  'Partner B': '35',
  'Partner C': '30',
};

export const WORKBOOK_CATEGORIES: readonly PnlCategory[] = [
  {
    id: 'Operations Overhead',
    name: 'Operations Overhead',
    pnlLine: PnlLine.OPERATIONS_OVERHEAD,
    sortOrder: 1,
  },
  {
    id: 'Operations Salaries',
    name: 'Operations Salaries',
    pnlLine: PnlLine.OPERATIONS_SALARIES,
    sortOrder: 2,
  },
  {
    id: 'Management Salaries & Overhead',
    name: 'Management Salaries & Overhead',
    pnlLine: PnlLine.MANAGEMENT,
    sortOrder: 3,
  },
  { id: 'Sales Salaries', name: 'Sales Salaries', pnlLine: PnlLine.SALES_SALARIES, sortOrder: 4 },
  { id: 'Sales Overheads', name: 'Sales Overheads', pnlLine: PnlLine.SALES_OVERHEAD, sortOrder: 5 },
];

export function workbookMonthToPnlInput(month: WorkbookMonth): MonthlyPnlInput {
  return {
    revenueLines: month.revenue.map((line) => ({
      gross: String(line.gross),
      feePercent: String(line.feePercent),
    })),
    adjustmentAmounts: [],
    expenseLines: month.expenses.map((line) => ({
      amount: String(line.amount),
      currency: line.currency,
      fundingSource: line.funding === 'EXTERNAL' ? FundingSource.EXTERNAL : FundingSource.COMPANY,
      categoryId: line.category,
    })),
    categories: WORKBOOK_CATEGORIES,
    currencies: { reporting: 'USD', display: 'PKR' },
    rate: String(month.rate),
    shares: WORKBOOK_PARTNERS.map((partner) => ({
      partnerId: partner,
      partnerName: partner,
      splitPercent: WORKBOOK_SPLIT_PERCENT[partner],
    })),
    reserveRule: { enabled: true, reservePercent: '5', appliesInLossMonth: true },
  };
}
