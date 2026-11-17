import { AuditAction, LedgerEntryType } from '@/generated/prisma/enums';
import { AUDIT_ENTITY } from '@/lib/constants';
import { Decimal } from '@/lib/decimal';
import { MESSAGES } from '@/lib/messages';
import { monthOfIsoDate } from '@/lib/month';
import { summarizeLedger } from '@/server/domain/partner-ledger';
import { NotFoundError, RuleViolationError } from '@/server/errors';
import { assertMonthsOpen } from '@/server/period-guard';
import { auditedChange, auditedCreate } from '@/server/repositories/audited-write';
import { ledgerRepository } from '@/server/repositories/ledger.repository';
import { partnerRepository } from '@/server/repositories/profit-sharing.repository';
import type { LedgerMovementInput } from '@/server/validators/ledger.schema';
import type { SessionUser } from '@/types/auth';
import type { PartnerLedgerView } from '@/types/ledger';

/**
 * Each founder's ledger: shares and reserves posted at month close, withdrawals and funding
 * recorded as they happen. Pending to withdraw is the running sum (PRD §6), never typed.
 */
export async function getPartnerLedgers(): Promise<PartnerLedgerView[]> {
  const [partners, entries] = await Promise.all([
    partnerRepository.list(),
    ledgerRepository.list(),
  ]);
  return partners.map((partner) => {
    const own = entries.filter((entry) => entry.partnerId === partner.id);
    const months = summarizeLedger(own);
    const last = months.at(-1);
    return {
      partnerId: partner.id,
      partnerName: partner.name,
      active: partner.active,
      pending: last?.pending.toString() ?? '0',
      cumulativeReserves: last?.cumulativeReserves.toString() ?? '0',
      fundedTotal: months
        .reduce((total, month) => total.plus(month.fundedIn), new Decimal(0))
        .toString(),
      months: months
        .map((month) => ({
          month: month.month,
          previousPending: month.previousPending.toString(),
          takeHome: month.takeHome.toString(),
          reserve: month.reserve.toString(),
          withdrawn: month.withdrawn.toString(),
          adjustments: month.adjustments.toString(),
          fundedIn: month.fundedIn.toString(),
          pending: month.pending.toString(),
        }))
        .reverse(),
      manualEntries: own.filter((entry) => entry.periodId === null).reverse(),
    };
  });
}

async function recordMovement(
  actor: SessionUser,
  input: LedgerMovementInput,
  type: typeof LedgerEntryType.WITHDRAWAL | typeof LedgerEntryType.FUNDING_IN,
): Promise<void> {
  const month = monthOfIsoDate(input.occurredOn);
  await assertMonthsOpen(month);
  if (!(await partnerRepository.findById(input.partnerId))) throw new NotFoundError();
  const amount = new Decimal(input.amount);
  await auditedCreate(actor.id, AUDIT_ENTITY.LEDGER_ENTRY, () =>
    ledgerRepository.create({
      partnerId: input.partnerId,
      occurredOn: input.occurredOn,
      month,
      type,
      amount: (type === LedgerEntryType.WITHDRAWAL ? amount.negated() : amount).toString(),
      accountId: input.accountId,
      note: input.note,
      periodId: null,
      createdById: actor.id,
    }),
  );
}

/** Money a founder took out; it lowers pending to withdraw and leaves the chosen account. */
export function recordWithdrawal(actor: SessionUser, input: LedgerMovementInput): Promise<void> {
  return recordMovement(actor, input, LedgerEntryType.WITHDRAWAL);
}

/** Money a founder put in for the company (PRD §5.6); recorded, but not withdrawable profit. */
export function recordFunding(actor: SessionUser, input: LedgerMovementInput): Promise<void> {
  return recordMovement(actor, input, LedgerEntryType.FUNDING_IN);
}

export async function deleteLedgerEntry(actor: SessionUser, id: string): Promise<void> {
  const entry = await ledgerRepository.findById(id);
  if (!entry) throw new NotFoundError();
  if (entry.periodId) throw new RuleViolationError(MESSAGES.LEDGER.POSTED_BY_CLOSE);
  await assertMonthsOpen(entry.month);
  await auditedChange(actor.id, {
    action: AuditAction.DELETE,
    entityType: AUDIT_ENTITY.LEDGER_ENTRY,
    entityId: id,
    loadBefore: async () => entry,
    apply: () => ledgerRepository.softDelete(id),
  });
}
