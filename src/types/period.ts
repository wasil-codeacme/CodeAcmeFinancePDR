import type { DecimalString } from '@/lib/decimal';
import type { MonthKey } from '@/lib/month';
import type { MonthlyPnlResult } from '@/server/read-models/monthly-pnl';
import type { NextMonthReserveRecord } from '@/server/repositories/period.repository';
import type { ExpenseRecord } from '@/types/expense';

/** What a founder needs to see before closing a month (PRD §5.6). */
export type CloseChecks = {
  drafts: number;
  rateSet: boolean;
  splitSet: boolean;
  commissionDue: DecimalString;
  commissionPosted: boolean;
  balancesEntered: number;
  activeAccounts: number;
};

export type CloseOverview = {
  month: MonthKey;
  isClosed: boolean;
  closedAt: Date | null;
  reopenReason: string | null;
  checks: CloseChecks;
  pnl: MonthlyPnlResult;
  reserves: NextMonthReserveRecord[];
  advances: ExpenseRecord[];
};
