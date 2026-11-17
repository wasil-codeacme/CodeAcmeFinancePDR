import type { DecimalString } from '@/lib/decimal';
import type { MonthKey } from '@/lib/month';

export type ImportMonthPreview = {
  tab: string;
  month: MonthKey;
  rate: string | null;
  revenueLines: number;
  expenseLines: number;
  workbookNetProfit: DecimalString | null;
  appNetProfit: DecimalString | null;
  matchesWorkbook: boolean;
  alreadyHasEntries: boolean;
  warnings: string[];
};

export type ImportPreview = {
  months: ImportMonthPreview[];
  newClients: string[];
  newCategories: string[];
  missingPartners: string[];
};

export type ImportResult = {
  monthsImported: number;
  revenueLines: number;
  expenseLines: number;
  skippedTabs: string[];
};
