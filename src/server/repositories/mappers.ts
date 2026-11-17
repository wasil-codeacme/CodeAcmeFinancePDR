import type { Prisma } from '@/generated/prisma/client';
import type { DecimalString } from '@/lib/decimal';
import { type MonthKey, monthKeyToDate, toIsoDate, toMonthKey } from '@/lib/month';

/** Repositories hand services strings for decimals and dates so records cross into client components as-is. */
export function decimalToString(value: Prisma.Decimal): DecimalString {
  return value.toString();
}

export function nullableDecimalToString(value: Prisma.Decimal | null): DecimalString | null {
  return value === null ? null : value.toString();
}

export function dateToMonthKey(value: Date): MonthKey {
  return toMonthKey(value);
}

export function dateToIsoDate(value: Date): string {
  return toIsoDate(value);
}

export function nullableDateToIsoDate(value: Date | null): string | null {
  return value === null ? null : toIsoDate(value);
}

export function monthKeyToDbDate(month: MonthKey): Date {
  return monthKeyToDate(month);
}
