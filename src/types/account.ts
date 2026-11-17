import type { DecimalString } from '@/lib/decimal';
import type { MonthKey } from '@/lib/month';
import type { TransferRecord } from '@/server/repositories/account-balance.repository';

/** One account in one month, as exact decimal strings in the account's own currency. */
export type AccountMonthRow = {
  accountId: string;
  name: string;
  currency: string;
  ownerLabel: string | null;
  month: MonthKey;
  opening: DecimalString;
  /**
   * Totals only: partner withdrawals and funding are founder-only (PRD §3), so they are
   * never sent apart, even though the expected balance has to include them.
   */
  moneyIn: DecimalString;
  moneyOut: DecimalString;
  expectedClosing: DecimalString;
  enteredClosing: DecimalString | null;
  closing: DecimalString;
  difference: DecimalString | null;
};

export type AccountsMonthView = {
  month: MonthKey;
  rows: AccountMonthRow[];
  /** Company cash = sum of account closing balances (PRD §5.4), in both currencies. */
  totalReporting: DecimalString | null;
  totalDisplay: DecimalString | null;
  currencies: { reporting: string; display: string };
  missingRateMonths: MonthKey[];
  transfers: TransferRecord[];
  isClosed: boolean;
};
