import {
  AccountType,
  AdjustmentKind,
  CommissionBase,
  Frequency,
  FundingSource,
  InvoiceStatus,
  PnlLine,
  ProjectStatus,
  Role,
  SalesChannel,
  TeamMemberType,
  UserStatus,
} from '@/generated/prisma/enums';

/** User-facing names for stored enum values, worded as the workbook words them. */
export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  [ProjectStatus.IN_PROGRESS]: 'In Progress',
  [ProjectStatus.IN_REVIEW]: 'In Review',
  [ProjectStatus.COMPLETED]: 'Completed',
  [ProjectStatus.PARTIAL]: 'Partial',
};

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  [InvoiceStatus.INITIATED]: 'Initiated',
  [InvoiceStatus.PROCESSED]: 'Processed',
  [InvoiceStatus.PARTIALLY_PAID]: 'Partially Paid',
  [InvoiceStatus.PAID]: 'Paid',
};

export const PNL_LINE_LABEL: Record<PnlLine, string> = {
  [PnlLine.OPERATIONS_SALARIES]: 'Operations Salaries',
  [PnlLine.OPERATIONS_OVERHEAD]: 'Operations Overhead',
  [PnlLine.MANAGEMENT]: 'Management Salaries & Overhead',
  [PnlLine.SALES_SALARIES]: 'Sales Salaries',
  [PnlLine.SALES_OVERHEAD]: 'Sales Overheads',
};

export const PNL_LINE_ORDER: readonly PnlLine[] = [
  PnlLine.OPERATIONS_SALARIES,
  PnlLine.OPERATIONS_OVERHEAD,
  PnlLine.MANAGEMENT,
  PnlLine.SALES_SALARIES,
  PnlLine.SALES_OVERHEAD,
];

export const SALES_CHANNEL_LABEL: Record<SalesChannel, string> = {
  [SalesChannel.UPWORK]: 'Upwork',
  [SalesChannel.COLD_EMAIL]: 'Cold email',
  [SalesChannel.COLD_CALL]: 'Cold call',
  [SalesChannel.LINKEDIN]: 'LinkedIn',
  [SalesChannel.OTHER]: 'Other',
};

export const FUNDING_SOURCE_LABEL: Record<FundingSource, string> = {
  [FundingSource.COMPANY]: 'Company',
  [FundingSource.EXTERNAL]: 'External',
};

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  [AccountType.BANK]: 'Bank',
  [AccountType.PLATFORM]: 'Platform',
  [AccountType.WALLET]: 'Wallet',
  [AccountType.CASH]: 'Cash',
  [AccountType.OTHER]: 'Other',
};

export const TEAM_MEMBER_TYPE_LABEL: Record<TeamMemberType, string> = {
  [TeamMemberType.PARTNER]: 'Partner',
  [TeamMemberType.EMPLOYEE]: 'Employee',
  [TeamMemberType.CONTRACTOR]: 'Contractor',
  [TeamMemberType.BD]: 'BD',
};

export const COMMISSION_BASE_LABEL: Record<CommissionBase, string> = {
  [CommissionBase.NET_REVENUE]: 'Net revenue (after platform fee)',
  [CommissionBase.GROSS_REVENUE]: 'Gross revenue',
};

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  [Frequency.MONTHLY]: 'Monthly',
  [Frequency.QUARTERLY]: 'Quarterly',
  [Frequency.YEARLY]: 'Yearly',
};

export const ADJUSTMENT_KIND_LABEL: Record<AdjustmentKind, string> = {
  [AdjustmentKind.REDUCTION]: 'Reduction',
  [AdjustmentKind.WRITE_OFF]: 'Write-off',
};

export const ROLE_LABEL: Record<Role, string> = {
  [Role.FOUNDER]: 'Founder',
  [Role.FINANCE_MANAGER]: 'Finance Manager',
};

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  [UserStatus.INVITED]: 'Invited',
  [UserStatus.ACTIVE]: 'Active',
  [UserStatus.REMOVED]: 'Removed',
};

/** Builds `{ value, label }` options from a label map, preserving declaration order. */
export function optionsFrom<TValue extends string>(
  labels: Record<TValue, string>,
): { value: TValue; label: string }[] {
  // Object.keys widens to string[]; the keys of a Record<TValue, …> are exactly TValue.
  return (Object.keys(labels) as TValue[]).map((value) => ({ value, label: labels[value] }));
}
