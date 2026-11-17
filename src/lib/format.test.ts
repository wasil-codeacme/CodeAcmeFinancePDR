import { describe, expect, it } from 'vitest';

import { formatMoney, formatPercentValue, formatRatioAsPercent } from '@/lib/format';

describe('formatMoney', () => {
  it('groups thousands and rounds half-up to cents only for display', () => {
    expect(formatMoney('1234567.891')).toBe('1,234,567.89');
    expect(formatMoney('537.237410071942')).toBe('537.24');
    expect(formatMoney('0.005')).toBe('0.01');
  });

  it('keeps the sign on negatives but never shows -0.00', () => {
    expect(formatMoney('-261.987913669065')).toBe('-261.99');
    expect(formatMoney('-0.001')).toBe('0.00');
  });

  it('shows a dash for a missing value', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(undefined)).toBe('—');
  });
});

describe('percent formatting', () => {
  it('turns a ratio into a one-decimal percentage, blank when missing', () => {
    expect(formatRatioAsPercent('0.642556613391921')).toBe('64.3%');
    expect(formatRatioAsPercent(null)).toBe('—');
  });

  it('prints stored percent values without trailing zeros', () => {
    expect(formatPercentValue('10.0000')).toBe('10%');
    expect(formatPercentValue('12.5')).toBe('12.5%');
  });
});
