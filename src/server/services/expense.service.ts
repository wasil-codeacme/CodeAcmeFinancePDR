import { AuditAction, EntryStatus, FundingSource } from '@/generated/prisma/enums';
import { AUDIT_ENTITY } from '@/lib/constants';
import { Decimal } from '@/lib/decimal';
import { MESSAGES } from '@/lib/messages';
import { type MonthKey, dateInMonth, monthOfIsoDate } from '@/lib/month';
import { PERMISSION, hasPermission } from '@/lib/permissions';
import { type CurrencyPair, toDisplayCurrency } from '@/server/domain/currency';
import { isTemplateDue } from '@/server/domain/recurrence';
import { channelForExpense } from '@/server/domain/sales-cac';
import { assertMonthsOpen } from '@/server/period-guard';
import {
  ForbiddenError,
  MissingExchangeRateError,
  NotFoundError,
  RuleViolationError,
} from '@/server/errors';
import { auditedChange, auditedCreate } from '@/server/repositories/audited-write';
import { companyRepository } from '@/server/repositories/company.repository';
import { runInTransaction } from '@/server/repositories/db';
import { type ExpenseData, expenseRepository } from '@/server/repositories/expense.repository';
import { recurringTemplateRepository } from '@/server/repositories/recurring-template.repository';
import {
  exchangeRateRepository,
  expenseCategoryRepository,
} from '@/server/repositories/settings.repository';
import type { ExpenseInput, UpdateExpenseInput } from '@/server/validators/expense.schema';
import type { SessionUser } from '@/types/auth';
import type { ExpenseMonthView, ExpenseRecord, ExpenseRow } from '@/types/expense';

async function requireCurrencies(): Promise<CurrencyPair> {
  const company = await companyRepository.find();
  if (!company) throw new NotFoundError();
  return { reporting: company.reportingCurrency, display: company.displayCurrency };
}

function toExpenseRow(
  expense: ExpenseRecord,
  rate: string | null,
  currencies: CurrencyPair,
): ExpenseRow {
  let reportingAmount: string | null = expense.amount;
  if (expense.currency !== currencies.reporting) {
    reportingAmount = rate ? new Decimal(expense.amount).dividedBy(rate).toString() : null;
  }
  const displayAmount = toDisplayCurrency(expense.amount, expense.currency, rate, currencies);
  return { ...expense, reportingAmount, displayAmount: displayAmount?.toString() ?? null };
}

/** PRD §5.3: the month's lines in both currencies, and the categories they group under. */
export async function getExpenseMonth(month: MonthKey): Promise<ExpenseMonthView> {
  const [expenses, categories, currencies, rate] = await Promise.all([
    expenseRepository.listForMonth(month),
    expenseCategoryRepository.list(),
    requireCurrencies(),
    exchangeRateRepository.findEffective(month),
  ]);
  return {
    rows: expenses.map((expense) => toExpenseRow(expense, rate?.rate ?? null, currencies)),
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      pnlLine: category.pnlLine,
      active: category.active,
    })),
    rate: rate ? { value: rate.rate, month: rate.month } : null,
    currencies,
  };
}

/** Funding partner only applies to externally funded lines; a PKR line needs that month's rate. */
async function toExpenseData(
  input: ExpenseInput,
  status: EntryStatus,
  templateId: string | null,
): Promise<ExpenseData> {
  const currencies = await requireCurrencies();
  if (input.currency !== currencies.reporting && input.currency !== currencies.display) {
    throw new RuleViolationError(MESSAGES.SETTINGS.CURRENCY_NOT_SUPPORTED);
  }
  if (
    input.currency === currencies.display &&
    !(await exchangeRateRepository.findEffective(monthOfIsoDate(input.expenseDate)))
  ) {
    throw new MissingExchangeRateError();
  }
  const category = await expenseCategoryRepository.findById(input.categoryId);
  if (!category) throw new NotFoundError();
  return {
    ...input,
    status,
    fundingPartnerId:
      input.fundingSource === FundingSource.EXTERNAL ? input.fundingPartnerId : null,
    salesChannel: channelForExpense(category.pnlLine, input.salesChannel),
    recurringTemplateId: templateId,
  };
}

/** The P&L month and, for an advance, the earlier month the cash left in. */
function monthsTouched(input: { expenseDate: string; paidOn: string | null }): MonthKey[] {
  const months = [monthOfIsoDate(input.expenseDate)];
  if (input.paidOn && monthOfIsoDate(input.paidOn) !== months[0])
    months.push(monthOfIsoDate(input.paidOn));
  return months;
}

async function requireExpense(id: string): Promise<ExpenseRecord> {
  const expense = await expenseRepository.findById(id);
  if (!expense) throw new NotFoundError();
  return expense;
}

export async function createExpense(
  actor: SessionUser,
  input: ExpenseInput,
): Promise<ExpenseRecord> {
  await assertMonthsOpen(...monthsTouched(input));
  const data = await toExpenseData(input, EntryStatus.CONFIRMED, null);
  return auditedCreate(actor.id, AUDIT_ENTITY.EXPENSE, () =>
    expenseRepository.create(data, actor.id),
  );
}

export async function updateExpense(
  actor: SessionUser,
  input: UpdateExpenseInput,
): Promise<ExpenseRecord> {
  const { id, ...fields } = input;
  const existing = await requireExpense(id);
  await assertMonthsOpen(...monthsTouched(existing), ...monthsTouched(fields));
  const data = await toExpenseData(fields, existing.status, existing.recurringTemplateId);
  return auditedChange(actor.id, {
    action: AuditAction.UPDATE,
    entityType: AUDIT_ENTITY.EXPENSE,
    entityId: id,
    loadBefore: async () => existing,
    apply: () => expenseRepository.update(id, data, actor.id),
  });
}

export async function deleteExpense(actor: SessionUser, id: string): Promise<void> {
  const expense = await requireExpense(id);
  await assertMonthsOpen(...monthsTouched(expense));
  if (
    expense.status === EntryStatus.CONFIRMED &&
    !hasPermission(actor.role, PERMISSION.ENTRIES_DELETE_CONFIRMED)
  ) {
    throw new ForbiddenError();
  }
  await auditedChange(actor.id, {
    action: AuditAction.DELETE,
    entityType: AUDIT_ENTITY.EXPENSE,
    entityId: id,
    loadBefore: async () => expense,
    apply: () => expenseRepository.softDelete(id, actor.id),
  });
}

export async function confirmExpense(actor: SessionUser, id: string): Promise<ExpenseRecord> {
  const expense = await requireExpense(id);
  await assertMonthsOpen(...monthsTouched(expense));
  return auditedChange(actor.id, {
    action: AuditAction.UPDATE,
    entityType: AUDIT_ENTITY.EXPENSE,
    entityId: id,
    loadBefore: async () => expense,
    apply: () => expenseRepository.setStatus(id, EntryStatus.CONFIRMED, actor.id),
  });
}

export async function confirmAllDrafts(actor: SessionUser, month: MonthKey): Promise<number> {
  await assertMonthsOpen(month);
  const drafts = (await expenseRepository.listForMonth(month)).filter(
    (expense) => expense.status === EntryStatus.DRAFT,
  );
  await runInTransaction(async () => {
    for (const draft of drafts) await confirmExpense(actor, draft.id);
  });
  return drafts.length;
}

/** PRD §5.3: recurring templates create drafts for the month; each is confirmed or adjusted. */
export async function generateRecurringDrafts(
  actor: SessionUser,
  month: MonthKey,
): Promise<number> {
  await assertMonthsOpen(month);
  const [templates, alreadyGenerated] = await Promise.all([
    recurringTemplateRepository.listActive(),
    expenseRepository.templateIdsGeneratedFor(month),
  ]);
  const due = templates.filter(
    (template) => isTemplateDue(template, month) && !alreadyGenerated.has(template.id),
  );
  if (due.length === 0) throw new RuleViolationError(MESSAGES.EXPENSE.NO_DRAFTS_DUE);
  await runInTransaction(async () => {
    for (const template of due) {
      const data = await toExpenseData(
        { ...template, expenseDate: dateInMonth(month, template.dayOfMonth), paidOn: null },
        EntryStatus.DRAFT,
        template.id,
      );
      await auditedCreate(actor.id, AUDIT_ENTITY.EXPENSE, () =>
        expenseRepository.create(data, actor.id),
      );
    }
  });
  return due.length;
}
