import type { DecimalString } from '@/lib/decimal';
import type { MonthKey } from '@/lib/month';
import type { LedgerEntryRecord } from '@/server/repositories/ledger.repository';

export type LedgerMonthView = {
  month: MonthKey;
  previousPending: DecimalString;
  takeHome: DecimalString;
  reserve: DecimalString;
  withdrawn: DecimalString;
  adjustments: DecimalString;
  fundedIn: DecimalString;
  pending: DecimalString;
};

export type PartnerLedgerView = {
  partnerId: string;
  partnerName: string;
  active: boolean;
  /** Pending to withdraw today: carried forward month by month, never typed. */
  pending: DecimalString;
  cumulativeReserves: DecimalString;
  fundedTotal: DecimalString;
  months: LedgerMonthView[];
  manualEntries: LedgerEntryRecord[];
};
