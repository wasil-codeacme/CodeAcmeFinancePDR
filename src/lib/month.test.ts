import { describe, expect, it } from 'vitest';

import {
  addMonths,
  compareMonthKeys,
  dateInMonth,
  formatMonthLabel,
  isIsoDate,
  isMonthKey,
  monthDateRange,
  monthFromSearchParam,
  monthOfIsoDate,
  monthsBetween,
  quarterOfMonth,
} from '@/lib/month';

describe('month keys', () => {
  it('accepts only YYYY-MM with a real month', () => {
    expect(isMonthKey('2026-01')).toBe(true);
    expect(isMonthKey('2026-13')).toBe(false);
    expect(isMonthKey('2026-1')).toBe(false);
  });

  it('adds months across year boundaries', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });

  it('counts whole months between two keys, negative when going back', () => {
    expect(monthsBetween('2026-03', '2027-03')).toBe(12);
    expect(monthsBetween('2026-03', '2026-01')).toBe(-2);
  });

  it('orders keys chronologically', () => {
    expect(compareMonthKeys('2026-02', '2026-10')).toBeLessThan(0);
  });

  it('builds a half-open UTC range for the month', () => {
    const range = monthDateRange('2026-02');
    expect(range.start.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(range.endExclusive.toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });

  it('clamps a day to the end of a short month', () => {
    expect(dateInMonth('2026-02', 31)).toBe('2026-02-28');
    expect(dateInMonth('2026-04', 5)).toBe('2026-04-05');
  });

  it('maps quarters Jan–Mar = 1 … Oct–Dec = 4', () => {
    expect(quarterOfMonth('2026-03')).toBe(1);
    expect(quarterOfMonth('2026-10')).toBe(4);
  });

  it('reads the month from a date and from search params, defaulting to now', () => {
    expect(monthOfIsoDate('2026-07-31')).toBe('2026-07');
    const now = new Date('2026-11-17T10:00:00Z');
    expect(monthFromSearchParam('2026-02', now)).toBe('2026-02');
    expect(monthFromSearchParam('garbage', now)).toBe('2026-11');
    expect(monthFromSearchParam(undefined, now)).toBe('2026-11');
  });

  it('validates ISO dates and formats labels in UTC', () => {
    expect(isIsoDate('2026-02-30')).toBe(true);
    expect(isIsoDate('26-02-01')).toBe(false);
    expect(formatMonthLabel('2026-01')).toBe('Jan 2026');
  });
});
