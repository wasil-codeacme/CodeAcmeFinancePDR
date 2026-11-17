import { AuditAction, FundingSource } from '@/generated/prisma/enums';
import { AUDIT_ENTITY } from '@/lib/constants';
import { NotFoundError } from '@/server/errors';
import { auditedChange, auditedCreate } from '@/server/repositories/audited-write';
import {
  type RecurringTemplateData,
  recurringTemplateRepository,
} from '@/server/repositories/recurring-template.repository';
import type { RecurringTemplateInput } from '@/server/validators/expense.schema';
import type { SessionUser } from '@/types/auth';
import type { RecurringTemplateRecord } from '@/types/expense';

function toData(input: RecurringTemplateInput): RecurringTemplateData {
  return {
    ...input,
    fundingPartnerId:
      input.fundingSource === FundingSource.EXTERNAL ? input.fundingPartnerId : null,
  };
}

export function listRecurringTemplates(): Promise<RecurringTemplateRecord[]> {
  return recurringTemplateRepository.list();
}

export function createRecurringTemplate(
  actor: SessionUser,
  input: RecurringTemplateInput,
): Promise<RecurringTemplateRecord> {
  return auditedCreate(actor.id, AUDIT_ENTITY.RECURRING_TEMPLATE, () =>
    recurringTemplateRepository.create(toData(input)),
  );
}

export function updateRecurringTemplate(
  actor: SessionUser,
  id: string,
  input: RecurringTemplateInput,
): Promise<RecurringTemplateRecord> {
  return auditedChange(actor.id, {
    action: AuditAction.UPDATE,
    entityType: AUDIT_ENTITY.RECURRING_TEMPLATE,
    entityId: id,
    loadBefore: async () => {
      const existing = await recurringTemplateRepository.findById(id);
      if (!existing) throw new NotFoundError();
      return existing;
    },
    apply: () => recurringTemplateRepository.update(id, toData(input)),
  });
}
