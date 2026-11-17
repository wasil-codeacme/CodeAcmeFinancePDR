import type { AgeingBucket } from '@/server/domain/ageing';
import type { DecimalString } from '@/lib/decimal';
import type { ReceivableTotalsView, RevenueRow } from '@/types/revenue';

export type ReceivableItem = RevenueRow & {
  ageDays: number;
  ageingBucket: AgeingBucket;
  isOverdue: boolean;
};

export type ReceivablesView = {
  items: ReceivableItem[];
  ageing: { bucket: AgeingBucket; outstanding: DecimalString }[];
  totals: ReceivableTotalsView;
};
