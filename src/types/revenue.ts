import type {
  AdjustmentKind,
  EntryStatus,
  InvoiceStatus,
  ProjectStatus,
  RevenueKind,
} from '@/generated/prisma/enums';
import type { DecimalString } from '@/lib/decimal';
import type { MonthKey } from '@/lib/month';

export type ReceiptRecord = {
  id: string;
  receivedOn: string;
  amount: DecimalString;
  accountId: string | null;
  accountName: string | null;
  isEscrow: boolean;
};

export type AdjustmentRecord = {
  id: string;
  adjustedOn: string;
  postingMonth: MonthKey;
  amount: DecimalString;
  kind: AdjustmentKind;
  reason: string;
};

export type RevenueEntryRecord = {
  id: string;
  kind: RevenueKind;
  status: EntryStatus;
  clientId: string;
  clientName: string;
  projectId: string | null;
  projectName: string | null;
  platformId: string | null;
  platformName: string | null;
  bookingMonth: MonthKey;
  description: string | null;
  gross: DecimalString | null;
  feePercent: DecimalString;
  projectStatus: ProjectStatus;
  invoiceStatus: InvoiceStatus;
  referredBy: string | null;
  closedByTeamMemberId: string | null;
  closedByName: string | null;
  expectedDate: string | null;
  notes: string | null;
  receipts: ReceiptRecord[];
  adjustments: AdjustmentRecord[];
};

/** Computed money columns for one entry, as exact decimal strings for the UI. */
export type RevenueFiguresView = {
  gross: DecimalString;
  fee: DecimalString;
  net: DecimalString;
  received: DecimalString;
  fundedEscrow: DecimalString;
  adjusted: DecimalString;
  outstanding: DecimalString;
  unfunded: DecimalString;
};

export type RevenueRow = RevenueEntryRecord & { figures: RevenueFiguresView };

export type ReceivableTotalsView = {
  netBooked: DecimalString;
  received: DecimalString;
  fundedEscrow: DecimalString;
  unfunded: DecimalString;
  outstanding: DecimalString;
  writtenOff: DecimalString;
  collectionRate: DecimalString | null;
};
