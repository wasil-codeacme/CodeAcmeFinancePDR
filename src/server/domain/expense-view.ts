import { EntryStatus, FundingSource } from '@/generated/prisma/enums';
import { Decimal, type DecimalString, sumDecimals } from '@/lib/decimal';
import type { ExpenseCategoryGroup, ExpenseCategoryMeta, ExpenseRow } from '@/types/expense';

export type ExpenseLists = {
  groups: ExpenseCategoryGroup[];
  drafts: ExpenseRow[];
  companyTotal: DecimalString;
  externalTotal: DecimalString;
};

function totalOf(rows: readonly ExpenseRow[], source: FundingSource): DecimalString {
  return sumDecimals(
    rows
      .filter((row) => row.fundingSource === source)
      .map((row) => new Decimal(row.reportingAmount ?? 0)),
  ).toString();
}

/**
 * PRD §5.3: the month grouped by category with subtotals in both currencies, drafts kept
 * apart. Shared by the server and the expenses page, so an instant confirm or delete on
 * screen regroups and re-totals exactly as the server will.
 */
export function groupExpenseMonth(
  rows: readonly ExpenseRow[],
  categories: readonly ExpenseCategoryMeta[],
): ExpenseLists {
  const confirmed = rows.filter((row) => row.status === EntryStatus.CONFIRMED);
  const groups = categories.flatMap((category) => {
    const categoryRows = confirmed.filter((row) => row.categoryId === category.id);
    if (categoryRows.length === 0 && !category.active) return [];
    const displayValues = categoryRows.map((row) => row.displayAmount);
    return [
      {
        categoryId: category.id,
        categoryName: category.name,
        pnlLine: category.pnlLine,
        rows: categoryRows,
        companyTotal: totalOf(categoryRows, FundingSource.COMPANY),
        externalTotal: totalOf(categoryRows, FundingSource.EXTERNAL),
        displayTotal: displayValues.includes(null)
          ? null
          : sumDecimals(displayValues.map((value) => new Decimal(value ?? 0))).toString(),
      },
    ];
  });
  return {
    groups,
    drafts: rows.filter((row) => row.status === EntryStatus.DRAFT),
    companyTotal: totalOf(confirmed, FundingSource.COMPANY),
    externalTotal: totalOf(confirmed, FundingSource.EXTERNAL),
  };
}
