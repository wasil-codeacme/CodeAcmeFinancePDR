import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { AccountType, PnlLine, Role, TeamMemberType } from '@/generated/prisma/enums';
import type { MonthKey } from '@/lib/month';
import { normalizeName } from '@/server/import/workbook-mapping';
import { companyRepository } from '@/server/repositories/company.repository';
import { platformRepository } from '@/server/repositories/platform.repository';
import { partnerRepository } from '@/server/repositories/profit-sharing.repository';
import {
  accountRepository,
  expenseCategoryRepository,
  teamMemberRepository,
} from '@/server/repositories/settings.repository';
import { userRepository } from '@/server/repositories/user.repository';
import { completeOnboarding, saveCompany } from '@/server/services/company.service';
import { importWorkbook, previewWorkbookImport } from '@/server/services/import.service';
import { createPlatform } from '@/server/services/platform.service';
import {
  addPartner,
  saveReserveRule,
  saveSplitVersion,
} from '@/server/services/profit-sharing.service';
import {
  createAccount,
  createExpenseCategory,
  createTeamMember,
  saveExchangeRate,
} from '@/server/services/settings.service';
import type { SessionUser } from '@/types/auth';

/**
 * Local demo data: sets the business up the way the reference workbook implies, then imports
 * every month tab of the anonymised sample. Safe to re-run: existing records are reused and
 * months that already have entries are skipped. Usage: pnpm db:seed:demo
 */
const FIRST_MONTH: MonthKey = '2026-01';
const SAMPLE_WORKBOOK = path.resolve('test-fixtures/reference-workbook.xlsx');
const PARTNER_SPLITS = [
  ['Partner A', '35'],
  ['Partner B', '35'],
  ['Partner C', '30'],
] as const;
const ACCOUNTS = [
  ['Wise', 'Company'],
  ['Upwork', 'Partner B'],
  ['Elevate Pay', 'Partner B'],
] as const;
const PLATFORMS = [
  ['Upwork', '10'],
  ['Direct', '0'],
] as const;
const CATEGORIES = [
  ['Operations Overhead', PnlLine.OPERATIONS_OVERHEAD],
  ['Operations Salaries', PnlLine.OPERATIONS_SALARIES],
  ['Management Salaries & Overhead', PnlLine.MANAGEMENT],
  ['Sales Salaries', PnlLine.SALES_SALARIES],
  ['Sales Overheads', PnlLine.SALES_OVERHEAD],
] as const;

const has = (records: readonly { name: string }[], name: string) =>
  records.some((record) => normalizeName(record.name) === normalizeName(name));

async function setUpBusiness(actor: SessionUser): Promise<string> {
  if (!(await companyRepository.find())) {
    await saveCompany(actor, {
      name: 'CodeAcme',
      reportingCurrency: 'USD',
      displayCurrency: 'PKR',
    });
  }
  for (const [name] of PARTNER_SPLITS) {
    if (!has(await partnerRepository.list(), name)) await addPartner(actor, name);
  }
  const partners = await partnerRepository.list();
  await saveSplitVersion(actor, {
    effectiveFrom: FIRST_MONTH,
    shares: PARTNER_SPLITS.map(([name, splitPercent]) => ({
      partnerId: partners.find((partner) => partner.name === name)?.id ?? '',
      splitPercent,
    })),
  });
  await saveReserveRule(actor, {
    effectiveFrom: FIRST_MONTH,
    enabled: true,
    reservePercent: '5',
    appliesInLossMonth: true,
  });
  for (const [name, ownerLabel] of ACCOUNTS) {
    if (has(await accountRepository.list(), name)) continue;
    await createAccount(actor, {
      name,
      type: name === 'Wise' ? AccountType.BANK : AccountType.PLATFORM,
      currency: 'USD',
      ownerLabel,
      openingBalance: '0',
      openingBalanceMonth: FIRST_MONTH,
      active: true,
    });
  }
  for (const [name, feePercent] of PLATFORMS) {
    if (!has(await platformRepository.list(), name)) {
      await createPlatform(actor, { name, feePercent, effectiveFrom: FIRST_MONTH });
    }
  }
  for (const [name, pnlLine] of CATEGORIES) {
    if (!has(await expenseCategoryRepository.list(), name)) {
      await createExpenseCategory(actor, { name, pnlLine, active: true });
    }
  }
  if (!has(await teamMemberRepository.list(), 'Employee 2')) {
    await createTeamMember(actor, {
      name: 'Employee 2',
      type: TeamMemberType.BD,
      defaultCategoryId: null,
      earnsCommission: true,
      active: true,
    });
  }
  await saveExchangeRate(actor, { month: FIRST_MONTH, rate: '278' });
  await completeOnboarding(actor);
  const wise = (await accountRepository.list()).find((account) => account.name === 'Wise');
  if (!wise) throw new Error('Wise account missing');
  return wise.id;
}

async function main(): Promise<void> {
  const founder = (await userRepository.list()).find((user) => user.role === Role.FOUNDER);
  if (!founder) throw new Error('Create a founder first: pnpm founder:create --email … --name …');
  const actor = { id: founder.id, email: founder.email, name: founder.name, role: founder.role };
  const receivedAccountId = await setUpBusiness(actor);
  const file = await readFile(SAMPLE_WORKBOOK);
  const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  const preview = await previewWorkbookImport(buffer);
  const result = await importWorkbook(actor, buffer, {
    months: preview.months.map((month) => month.month),
    receivedAccountId,
  });
  process.stdout.write(
    `Demo data ready: ${result.monthsImported} months imported (${result.revenueLines} revenue, ` +
      `${result.expenseLines} expense lines)` +
      (result.skippedTabs.length ? `; skipped ${result.skippedTabs.join(', ')}` : '') +
      '.\n',
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
