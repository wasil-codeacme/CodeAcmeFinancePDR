import type {
  EntryStatus,
  Frequency,
  FundingSource,
  PnlLine,
  SalesChannel,
} from '@/generated/prisma/enums';
import type { DecimalString } from '@/lib/decimal';
import type { MonthKey } from '@/lib/month';

export type ExpenseAttachmentRecord = {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
};

export type ExpenseRecord = {
  id: string;
  status: EntryStatus;
  expenseDate: string;
  /** Set when cash left in an earlier month than the expense counts in (an advance). */
  paidOn: string | null;
  month: MonthKey;
  categoryId: string;
  categoryName: string;
  item: string;
  payeeTeamMemberId: string | null;
  payeeName: string | null;
  amount: DecimalString;
  currency: string;
  fundingSource: FundingSource;
  fundingPartnerId: string | null;
  fundingPartnerName: string | null;
  paidFromAccountId: string | null;
  paidFromAccountName: string | null;
  recurringTemplateId: string | null;
  salesChannel: SalesChannel | null;
  notes: string | null;
  attachments: ExpenseAttachmentRecord[];
};

/** An expense with both currency columns filled in from the month's rate. */
export type ExpenseRow = ExpenseRecord & {
  reportingAmount: DecimalString | null;
  displayAmount: DecimalString | null;
};

export type ExpenseCategoryGroup = {
  categoryId: string;
  categoryName: string;
  pnlLine: PnlLine;
  rows: ExpenseRow[];
  companyTotal: DecimalString;
  externalTotal: DecimalString;
  displayTotal: DecimalString | null;
};

export type ExpenseCategoryMeta = { id: string; name: string; pnlLine: PnlLine; active: boolean };

export type ExpenseMonthView = {
  /** Every line of the month, confirmed and draft; the page groups them (groupExpenseMonth). */
  rows: ExpenseRow[];
  categories: ExpenseCategoryMeta[];
  rate: { value: DecimalString; month: MonthKey } | null;
  currencies: { reporting: string; display: string };
};

export type RecurringTemplateRecord = {
  id: string;
  categoryId: string;
  categoryName: string;
  item: string;
  payeeTeamMemberId: string | null;
  amount: DecimalString;
  currency: string;
  fundingSource: FundingSource;
  fundingPartnerId: string | null;
  paidFromAccountId: string | null;
  salesChannel: SalesChannel | null;
  notes: string | null;
  frequency: Frequency;
  dayOfMonth: number;
  startMonth: MonthKey;
  endMonth: MonthKey | null;
  active: boolean;
};
