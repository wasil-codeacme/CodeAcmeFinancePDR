import { AuditAction, EntryStatus, ExpenseKind, FundingSource } from '@/generated/prisma/enums';
import { AUDIT_ENTITY, MONEY_DECIMALS } from '@/lib/constants';
import { Decimal } from '@/lib/decimal';
import { MESSAGES } from '@/lib/messages';
import { type MonthKey, dateInMonth } from '@/lib/month';
import { NotFoundError, RuleViolationError } from '@/server/errors';
import { assertMonthsOpen } from '@/server/period-guard';
import { type BdCommissionDue, loadBdCommission } from '@/server/read-models/bd-commission';
import { auditedCreate } from '@/server/repositories/audited-write';
import { auditRepository } from '@/server/repositories/audit.repository';
import { companyRepository } from '@/server/repositories/company.repository';
import { runInTransaction } from '@/server/repositories/db';
import { expenseRepository } from '@/server/repositories/expense.repository';
import type { SessionUser } from '@/types/auth';

const LAST_DAY = 31;

export function previewBdCommission(month: MonthKey): Promise<BdCommissionDue> {
  return loadBdCommission(month);
}

/**
 * PRD §6: BD commission is posted as a company sales expense. It is drafted per BD person so
 * a founder confirms it with the month's other drafts; re-posting replaces earlier drafts but
 * never a commission that was already confirmed.
 */
export async function postBdCommission(actor: SessionUser, month: MonthKey): Promise<number> {
  await assertMonthsOpen(month);
  const [due, company, existing] = await Promise.all([
    loadBdCommission(month),
    companyRepository.find(),
    expenseRepository.listByKindForMonth(month, ExpenseKind.BD_COMMISSION),
  ]);
  if (!company) throw new NotFoundError();
  const categoryId = due.rule?.categoryId;
  if (!due.rule || !categoryId) throw new RuleViolationError(MESSAGES.COMMISSION.CATEGORY_REQUIRED);
  if (due.rows.length === 0) throw new RuleViolationError(MESSAGES.COMMISSION.NOTHING_DUE);
  const confirmedFor = new Set(
    existing
      .filter((expense) => expense.status === EntryStatus.CONFIRMED)
      .flatMap((expense) => expense.payeeTeamMemberId ?? []),
  );
  const toPost = due.rows.filter((row) => !confirmedFor.has(row.teamMemberId));
  await runInTransaction(async () => {
    for (const draft of existing.filter((expense) => expense.status === EntryStatus.DRAFT)) {
      const removed = await expenseRepository.softDelete(draft.id, actor.id);
      await auditRepository.record({
        actorUserId: actor.id,
        action: AuditAction.DELETE,
        entityType: AUDIT_ENTITY.EXPENSE,
        entityId: draft.id,
        before: removed,
      });
    }
    for (const row of toPost) {
      await auditedCreate(actor.id, AUDIT_ENTITY.EXPENSE, () =>
        expenseRepository.create(
          {
            kind: ExpenseKind.BD_COMMISSION,
            status: EntryStatus.DRAFT,
            expenseDate: dateInMonth(month, LAST_DAY),
            paidOn: null,
            categoryId,
            item: `BD commission — ${row.name}`,
            payeeTeamMemberId: row.teamMemberId,
            amount: row.commission.toFixed(MONEY_DECIMALS, Decimal.ROUND_HALF_UP),
            currency: company.reportingCurrency,
            fundingSource: FundingSource.COMPANY,
            fundingPartnerId: null,
            paidFromAccountId: null,
            recurringTemplateId: null,
            salesChannel: null,
            notes: `${row.base.toFixed(MONEY_DECIMALS)} base`,
          },
          actor.id,
        ),
      );
    }
  });
  return toPost.length;
}
