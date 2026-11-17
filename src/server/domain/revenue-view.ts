import {
  type ReceivableTotals,
  type RevenueLineFigures,
  computeRevenueLine,
} from '@/server/domain/revenue-math';
import type {
  ReceivableTotalsView,
  RevenueEntryRecord,
  RevenueFiguresView,
  RevenueRow,
} from '@/types/revenue';

export function figuresOf(entry: RevenueEntryRecord): RevenueLineFigures {
  return computeRevenueLine({
    gross: entry.gross,
    feePercent: entry.feePercent,
    receipts: entry.receipts,
    adjustments: entry.adjustments,
  });
}

export function toFiguresView(figures: RevenueLineFigures): RevenueFiguresView {
  return {
    gross: figures.gross.toString(),
    fee: figures.fee.toString(),
    net: figures.net.toString(),
    received: figures.received.toString(),
    fundedEscrow: figures.fundedEscrow.toString(),
    adjusted: figures.adjusted.toString(),
    outstanding: figures.outstanding.toString(),
    unfunded: figures.unfunded.toString(),
  };
}

export function toRevenueRow(entry: RevenueEntryRecord): RevenueRow {
  return { ...entry, figures: toFiguresView(figuresOf(entry)) };
}

export function toReceivableTotalsView(totals: ReceivableTotals): ReceivableTotalsView {
  return {
    netBooked: totals.netBooked.toString(),
    received: totals.received.toString(),
    fundedEscrow: totals.fundedEscrow.toString(),
    unfunded: totals.unfunded.toString(),
    outstanding: totals.outstanding.toString(),
    writtenOff: totals.writtenOff.toString(),
    collectionRate: totals.collectionRate?.toString() ?? null,
  };
}
