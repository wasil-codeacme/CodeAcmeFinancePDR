import { MESSAGES } from '@/lib/messages';
import { type MonthKey, formatMonthLabel } from '@/lib/month';
import { RuleViolationError } from '@/server/errors';
import { periodRepository } from '@/server/repositories/period.repository';

/**
 * PRD §5.6: a closed month is read-only. Every write that lands in a month checks here first,
 * so no screen or action can change figures that were closed and distributed.
 */
export async function assertMonthsOpen(...months: MonthKey[]): Promise<void> {
  const closed = await periodRepository.closedAmong([...new Set(months)]);
  if (closed.length > 0) {
    throw new RuleViolationError(
      `${MESSAGES.PERIOD.CLOSED_MONTH} ${closed.map(formatMonthLabel).join(', ')}`,
    );
  }
}

export async function isMonthClosed(month: MonthKey): Promise<boolean> {
  return (await periodRepository.closedAmong([month])).includes(month);
}
