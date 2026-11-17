import { AuditAction, FundingSource } from '@/generated/prisma/enums';
import { AUDIT_ENTITY } from '@/lib/constants';
import { Decimal } from '@/lib/decimal';
import { MESSAGES } from '@/lib/messages';
import type { MonthKey } from '@/lib/month';
import { spreadsheetReader } from '@/server/container';
import { computeMonthlyPnl } from '@/server/domain/pnl';
import { NotFoundError, RuleViolationError } from '@/server/errors';
import {
  normalizeName,
  pnlLineForSection,
  splitClientAndPlatform,
} from '@/server/import/workbook-mapping';
import {
  type ParsedSalesCac,
  SALES_CAC_SHEET_PATTERN,
  parseSalesCacSheet,
} from '@/server/import/sales-cac-parser';
import { type ParsedMonth, parseWorkbook } from '@/server/import/workbook-parser';
import { importMonth, type ImportLookups } from '@/server/import/workbook-writer';
import { auditedChange } from '@/server/repositories/audited-write';
import { clientRepository } from '@/server/repositories/client.repository';
import { companyRepository } from '@/server/repositories/company.repository';
import { expenseRepository } from '@/server/repositories/expense.repository';
import { platformRepository } from '@/server/repositories/platform.repository';
import { partnerRepository } from '@/server/repositories/profit-sharing.repository';
import { revenueRepository } from '@/server/repositories/revenue.repository';
import { salesActivityRepository } from '@/server/repositories/sales-activity.repository';
import {
  accountRepository,
  expenseCategoryRepository,
} from '@/server/repositories/settings.repository';
import type { SessionUser } from '@/types/auth';
import type { ImportMonthPreview, ImportPreview, ImportResult } from '@/types/import';

/** Excel keeps ~15 significant digits; closer than this is the same figure. */
const MATCH_TOLERANCE = new Decimal('0.000001');

type Currencies = { reporting: string; display: string };

async function requireCurrencies(): Promise<Currencies> {
  const company = await companyRepository.find();
  if (!company) throw new NotFoundError();
  return { reporting: company.reportingCurrency, display: company.displayCurrency };
}

type ReadWorkbook = { months: ParsedMonth[]; salesCac: ParsedSalesCac };

async function readWorkbook(file: ArrayBuffer): Promise<ReadWorkbook> {
  const sheets = await spreadsheetReader.read(file);
  const months = parseWorkbook(sheets);
  if (months.length === 0) throw new RuleViolationError(MESSAGES.IMPORT.NO_MONTH_TABS);
  const cacSheet = sheets.find(
    (sheet) => !sheet.hidden && SALES_CAC_SHEET_PATTERN.test(sheet.name),
  );
  // The sheet names months without a year; it belongs to the same year as the month tabs.
  const year = Number(months.at(-1)?.month.slice(0, 4));
  const salesCac = cacSheet ? parseSalesCacSheet(cacSheet, year) : { activity: [], warnings: [] };
  return { months, salesCac };
}

async function monthHasEntries(month: MonthKey): Promise<boolean> {
  const [revenue, expenses] = await Promise.all([
    revenueRepository.countForMonth(month),
    expenseRepository.countForMonth(month),
  ]);
  return revenue + expenses > 0;
}

/** Net profit (company) the app will compute for the tab, to set beside the workbook's own figure. */
function appNetProfit(month: ParsedMonth, currencies: Currencies): Decimal | null {
  if (month.rate === null && month.expenses.some((line) => !line.inReportingCurrency)) return null;
  const sections = [...new Set(month.expenses.map((line) => line.section))];
  const pnl = computeMonthlyPnl({
    revenueLines: month.revenue.map((line) => ({
      gross: String(line.gross),
      feePercent: String(line.feePercent),
    })),
    adjustmentAmounts: [],
    expenseLines: month.expenses.map((line) => ({
      amount: String(line.amount),
      currency: line.inReportingCurrency ? currencies.reporting : currencies.display,
      fundingSource: line.fundingPartnerName ? FundingSource.EXTERNAL : FundingSource.COMPANY,
      categoryId: line.section,
    })),
    categories: sections.map((section, index) => ({
      id: section,
      name: section,
      pnlLine: pnlLineForSection(section),
      sortOrder: index,
    })),
    currencies,
    rate: month.rate === null ? null : String(month.rate),
    shares: null,
    reserveRule: null,
  });
  return pnl.netProfitCompany;
}

async function previewMonth(
  month: ParsedMonth,
  currencies: Currencies,
): Promise<ImportMonthPreview> {
  const appProfit = appNetProfit(month, currencies);
  const workbookProfit =
    month.workbookTotals.netProfit === null ? null : new Decimal(month.workbookTotals.netProfit);
  return {
    tab: month.tab,
    month: month.month,
    rate: month.rate === null ? null : String(month.rate),
    revenueLines: month.revenue.length,
    expenseLines: month.expenses.length,
    workbookNetProfit: workbookProfit?.toString() ?? null,
    appNetProfit: appProfit?.toString() ?? null,
    matchesWorkbook: Boolean(
      appProfit &&
      workbookProfit &&
      appProfit.minus(workbookProfit).abs().lessThanOrEqualTo(MATCH_TOLERANCE),
    ),
    alreadyHasEntries: await monthHasEntries(month.month),
    warnings: month.warnings,
  };
}

function missingNames(wanted: Iterable<string>, existing: readonly { name: string }[]): string[] {
  const known = new Set(existing.map((record) => normalizeName(record.name)));
  return [...new Set(wanted)].filter((name) => !known.has(normalizeName(name))).sort();
}

/** Reads the workbook and reports what an import would create, without writing anything. */
export async function previewWorkbookImport(file: ArrayBuffer): Promise<ImportPreview> {
  const [{ months, salesCac }, currencies, clients, categories, partners, platforms] =
    await Promise.all([
      readWorkbook(file),
      requireCurrencies(),
      clientRepository.list(),
      expenseCategoryRepository.list(),
      partnerRepository.list(),
      platformRepository.list(),
    ]);
  const platformNames = platforms.map((platform) => platform.name);
  const clientNames = months.flatMap((month) =>
    month.revenue.map((line) => splitClientAndPlatform(line, platformNames).clientName),
  );
  const partnerNames = months.flatMap((month) =>
    month.expenses.flatMap((line) => line.fundingPartnerName ?? []),
  );
  return {
    months: await Promise.all(months.map((month) => previewMonth(month, currencies))),
    newClients: missingNames(clientNames, clients),
    newCategories: missingNames(
      months.flatMap((month) => month.expenses.map((line) => line.section)),
      categories,
    ),
    missingPartners: missingNames(partnerNames, partners),
    salesActivityMonths: [...new Set(salesCac.activity.map((entry) => entry.month))].sort(),
    salesActivityWarnings: salesCac.warnings,
  };
}

async function loadLookups(receivedAccountId: string): Promise<Omit<ImportLookups, 'currencies'>> {
  const [account, clients, categories, partners, platforms] = await Promise.all([
    accountRepository.findById(receivedAccountId),
    clientRepository.list(),
    expenseCategoryRepository.list(),
    partnerRepository.list(),
    platformRepository.list(),
  ]);
  if (!account) throw new NotFoundError();
  return { receivedAccountId: account.id, clients, categories, partners, platforms };
}

/**
 * Imports the chosen month tabs. Months that already have entries are skipped so a second
 * run never duplicates; each month is written in its own transaction with full audit.
 */
export async function importWorkbook(
  actor: SessionUser,
  file: ArrayBuffer,
  options: { months: readonly MonthKey[]; receivedAccountId: string },
): Promise<ImportResult> {
  const [{ months, salesCac }, currencies, lookups] = await Promise.all([
    readWorkbook(file),
    requireCurrencies(),
    loadLookups(options.receivedAccountId),
  ]);
  const chosen = months.filter((month) => options.months.includes(month.month));
  const missing = missingNames(
    chosen.flatMap((month) => month.expenses.flatMap((line) => line.fundingPartnerName ?? [])),
    lookups.partners,
  );
  if (missing.length > 0)
    throw new RuleViolationError(`${MESSAGES.IMPORT.MISSING_PARTNERS} ${missing.join(', ')}`);
  const result: ImportResult = {
    monthsImported: 0,
    revenueLines: 0,
    expenseLines: 0,
    skippedTabs: [],
    salesActivityRows: 0,
  };
  for (const month of chosen) {
    if (await monthHasEntries(month.month)) {
      result.skippedTabs.push(month.tab);
      continue;
    }
    const written = await importMonth(actor, month, { ...lookups, currencies });
    result.monthsImported += 1;
    result.revenueLines += written.revenueLines;
    result.expenseLines += written.expenseLines;
  }
  // Counts are upserted per channel and month, so importing twice never doubles them.
  for (const activity of salesCac.activity.filter((entry) =>
    options.months.includes(entry.month),
  )) {
    await auditedChange(actor.id, {
      action: AuditAction.UPDATE,
      entityType: AUDIT_ENTITY.SALES_ACTIVITY,
      entityId: `${activity.channel}:${activity.month}`,
      loadBefore: () => salesActivityRepository.find(activity.month, activity.channel),
      apply: () => salesActivityRepository.upsert(activity, actor.id),
    });
    result.salesActivityRows += 1;
  }
  return result;
}
