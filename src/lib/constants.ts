/** PRD §4: USD is the reporting currency; amounts without a stated currency are in it. */
export const DEFAULT_REPORTING_CURRENCY = 'USD';
export const CURRENCY_SYMBOL: Readonly<Record<string, string>> = {
  USD: '$',
  PKR: 'Rs ',
  EUR: '€',
  GBP: '£',
};

export const EMAIL_PROVIDER = { CONSOLE: 'console', RESEND: 'resend' } as const;

export const LOGIN_CODE_LENGTH = 6;
export const LOGIN_CODE_TTL_MINUTES = 10;
export const LOGIN_CODE_MAX_ATTEMPTS = 5;
export const LOGIN_CODE_REQUEST_LIMIT = 5;
export const LOGIN_CODE_REQUEST_WINDOW_MINUTES = 15;

export const SESSION_COOKIE_NAME = 'codeacme_session';
export const SESSION_TTL_DAYS = 30;
export const SESSION_TOKEN_BYTES = 32;

export const MS_PER_MINUTE = 60_000;
export const MS_PER_DAY = 86_400_000;

export const PERCENT_DIVISOR = 100;
export const FULL_SPLIT_PERCENT = 100;
export const MONEY_DECIMALS = 2;
export const PERCENT_DECIMALS = 1;
export const RATE_DECIMALS = 2;
export const MAX_PERCENT = 100;
export const MAX_MONEY_AMOUNT = 999_999_999_999;

export const MAX_NAME_LENGTH = 255;
export const MAX_NOTES_LENGTH = 2000;
export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
/** Receipts and invoices; matches the 5 MB in the attachment message and the action body limit. */
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const XLSX_EXTENSION = '.xlsx';

export const MONTHS_PER_QUARTER = 3;
export const MONTHS_PER_YEAR = 12;
export const RECURRENCE_INTERVAL_MONTHS = { MONTHLY: 1, QUARTERLY: 3, YEARLY: 12 } as const;
export const MAX_DAY_OF_MONTH = 28;

export const AGEING_BUCKET_LIMITS_DAYS = [30, 60, 90] as const;

export const AUDIT_ENTITY = {
  USER: 'User',
  COMPANY: 'CompanySettings',
  PARTNER: 'Partner',
  PROFIT_SPLIT: 'ProfitSplitVersion',
  RESERVE_RULE: 'ReserveRuleVersion',
  COMMISSION_RULE: 'CommissionRuleVersion',
  ACCOUNT: 'Account',
  PLATFORM: 'Platform',
  PLATFORM_FEE: 'PlatformFeeVersion',
  EXPENSE_CATEGORY: 'ExpenseCategory',
  TEAM_MEMBER: 'TeamMember',
  EXCHANGE_RATE: 'ExchangeRate',
  CLIENT: 'Client',
  PROJECT: 'Project',
  REVENUE_ENTRY: 'RevenueEntry',
  RECEIPT: 'Receipt',
  RECEIVABLE_ADJUSTMENT: 'ReceivableAdjustment',
  EXPENSE: 'Expense',
  EXPENSE_ATTACHMENT: 'ExpenseAttachment',
  RECURRING_TEMPLATE: 'RecurringTemplate',
  PERIOD: 'Period',
  ACCOUNT_BALANCE: 'AccountBalance',
  TRANSFER: 'Transfer',
  LEDGER_ENTRY: 'PartnerLedgerEntry',
  NEXT_MONTH_RESERVE: 'NextMonthReserve',
  SALES_ACTIVITY: 'SalesActivity',
} as const;

/** Upper bound for a typed count (responses, leads, calls) — catches a slipped key, not a rule. */
export const MAX_ACTIVITY_COUNT = 100_000;
export type AuditEntity = (typeof AUDIT_ENTITY)[keyof typeof AUDIT_ENTITY];

export const SEARCH_PARAM = {
  MONTH: 'month',
  CLIENT: 'client',
  PLATFORM: 'platform',
  STATUS: 'status',
  QUERY: 'q',
  STEP: 'step',
  PERIOD: 'period',
  REPORT: 'report',
  FORMAT: 'format',
  FIGURE: 'figure',
  LINE: 'line',
  FUNDING: 'funding',
} as const;
