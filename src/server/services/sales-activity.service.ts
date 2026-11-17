import { AuditAction } from '@/generated/prisma/enums';
import { AUDIT_ENTITY } from '@/lib/constants';
import type { MonthKey } from '@/lib/month';
import { SALES_CHANNEL_ORDER } from '@/server/domain/sales-cac';
import { auditedChange } from '@/server/repositories/audited-write';
import {
  type SalesActivityRecord,
  salesActivityRepository,
} from '@/server/repositories/sales-activity.repository';
import type { SalesActivityInput } from '@/server/validators/sales.schema';
import type { SessionUser } from '@/types/auth';

/** Every channel's counts for the month, zero where nothing has been entered yet. */
export async function getSalesActivity(month: MonthKey): Promise<SalesActivityRecord[]> {
  const entered = await salesActivityRepository.listForMonths([month]);
  return SALES_CHANNEL_ORDER.map(
    (channel) =>
      entered.find((entry) => entry.channel === channel) ?? {
        month,
        channel,
        interestedResponses: 0,
        leadsClosed: 0,
        callsMade: 0,
      },
  );
}

/**
 * Counts are not money and do not change the P&L, so they stay editable after a month is
 * closed — calls are often tallied late.
 */
export function saveSalesActivity(
  actor: SessionUser,
  input: SalesActivityInput,
): Promise<SalesActivityRecord> {
  return auditedChange(actor.id, {
    action: AuditAction.UPDATE,
    entityType: AUDIT_ENTITY.SALES_ACTIVITY,
    entityId: `${input.channel}:${input.month}`,
    loadBefore: () => salesActivityRepository.find(input.month, input.channel),
    apply: () => salesActivityRepository.upsert(input, actor.id),
  });
}
