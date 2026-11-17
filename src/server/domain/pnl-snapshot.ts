import { z } from 'zod';

import { PnlLine } from '@/generated/prisma/enums';
import { Decimal } from '@/lib/decimal';
import type { MonthlyPnl } from '@/server/domain/pnl';

/**
 * PRD §5.6: closing a month stores its P&L and distribution so later settings changes never
 * alter a closed month. Decimals are kept as exact strings in JSON.
 */
const amount = z.string();
const nullableAmount = z.string().nullable();

const pnlSnapshotSchema = z.object({
  grossRevenue: amount,
  platformFees: amount,
  netRevenueBooked: amount,
  receivableAdjustments: amount,
  netRevenue: amount,
  expenseLines: z.array(
    z.object({
      pnlLine: z.enum(PnlLine),
      company: amount,
      external: amount,
      categories: z.array(
        z.object({ id: z.string(), name: z.string(), company: amount, external: amount }),
      ),
    }),
  ),
  totalCompanyExpense: amount,
  totalExternalFunding: amount,
  grandTotalExpense: amount,
  netProfitCompany: amount,
  marginCompany: nullableAmount,
  netProfitInclExternal: amount,
  marginInclExternal: nullableAmount,
  distribution: z
    .object({
      distributableProfit: amount,
      totalReserves: amount,
      partners: z.array(
        z.object({
          partnerId: z.string(),
          partnerName: z.string(),
          splitPercent: amount,
          baselineShare: amount,
          reserve: amount,
          takeHome: amount,
          takeHomeDisplay: nullableAmount,
        }),
      ),
    })
    .nullable(),
});
export type PnlSnapshot = z.infer<typeof pnlSnapshotSchema>;

const text = (value: Decimal) => value.toString();
const nullableText = (value: Decimal | null) => (value === null ? null : value.toString());
const decimal = (value: string) => new Decimal(value);
const nullableDecimal = (value: string | null) => (value === null ? null : new Decimal(value));

export function toPnlSnapshot(pnl: MonthlyPnl): PnlSnapshot {
  return {
    grossRevenue: text(pnl.grossRevenue),
    platformFees: text(pnl.platformFees),
    netRevenueBooked: text(pnl.netRevenueBooked),
    receivableAdjustments: text(pnl.receivableAdjustments),
    netRevenue: text(pnl.netRevenue),
    expenseLines: pnl.expenseLines.map((line) => ({
      pnlLine: line.pnlLine,
      company: text(line.company),
      external: text(line.external),
      categories: line.categories.map((category) => ({
        id: category.id,
        name: category.name,
        company: text(category.company),
        external: text(category.external),
      })),
    })),
    totalCompanyExpense: text(pnl.totalCompanyExpense),
    totalExternalFunding: text(pnl.totalExternalFunding),
    grandTotalExpense: text(pnl.grandTotalExpense),
    netProfitCompany: text(pnl.netProfitCompany),
    marginCompany: nullableText(pnl.marginCompany),
    netProfitInclExternal: text(pnl.netProfitInclExternal),
    marginInclExternal: nullableText(pnl.marginInclExternal),
    distribution: pnl.distribution
      ? {
          distributableProfit: text(pnl.distribution.distributableProfit),
          totalReserves: text(pnl.distribution.totalReserves),
          partners: pnl.distribution.partners.map((partner) => ({
            partnerId: partner.partnerId,
            partnerName: partner.partnerName,
            splitPercent: text(partner.splitPercent),
            baselineShare: text(partner.baselineShare),
            reserve: text(partner.reserve),
            takeHome: text(partner.takeHome),
            takeHomeDisplay: nullableText(partner.takeHomeDisplay),
          })),
        }
      : null,
  };
}

/** Restores a stored snapshot; anything that does not match the shape is treated as missing. */
export function parsePnlSnapshot(stored: unknown): MonthlyPnl | null {
  const parsed = pnlSnapshotSchema.safeParse(stored);
  if (!parsed.success) return null;
  const snapshot = parsed.data;
  return {
    grossRevenue: decimal(snapshot.grossRevenue),
    platformFees: decimal(snapshot.platformFees),
    netRevenueBooked: decimal(snapshot.netRevenueBooked),
    receivableAdjustments: decimal(snapshot.receivableAdjustments),
    netRevenue: decimal(snapshot.netRevenue),
    expenseLines: snapshot.expenseLines.map((line) => ({
      pnlLine: line.pnlLine,
      company: decimal(line.company),
      external: decimal(line.external),
      categories: line.categories.map((category) => ({
        id: category.id,
        name: category.name,
        company: decimal(category.company),
        external: decimal(category.external),
      })),
    })),
    totalCompanyExpense: decimal(snapshot.totalCompanyExpense),
    totalExternalFunding: decimal(snapshot.totalExternalFunding),
    grandTotalExpense: decimal(snapshot.grandTotalExpense),
    netProfitCompany: decimal(snapshot.netProfitCompany),
    marginCompany: nullableDecimal(snapshot.marginCompany),
    netProfitInclExternal: decimal(snapshot.netProfitInclExternal),
    marginInclExternal: nullableDecimal(snapshot.marginInclExternal),
    distribution: snapshot.distribution
      ? {
          distributableProfit: decimal(snapshot.distribution.distributableProfit),
          totalReserves: decimal(snapshot.distribution.totalReserves),
          partners: snapshot.distribution.partners.map((partner) => ({
            partnerId: partner.partnerId,
            partnerName: partner.partnerName,
            splitPercent: decimal(partner.splitPercent),
            baselineShare: decimal(partner.baselineShare),
            reserve: decimal(partner.reserve),
            takeHome: decimal(partner.takeHome),
            takeHomeDisplay: nullableDecimal(partner.takeHomeDisplay),
          })),
        }
      : null,
  };
}
