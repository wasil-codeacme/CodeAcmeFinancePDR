import { describe, expect, it } from 'vitest';

import { AGEING_BUCKET, ageInDays, ageingBucket } from '@/server/domain/ageing';
import { toDisplayCurrency, toReportingCurrency } from '@/server/domain/currency';
import { pickEffectiveVersion } from '@/server/domain/effective-version';
import { resolveDefaultFee } from '@/server/domain/fee-default';
import { MissingExchangeRateError, RuleViolationError } from '@/server/errors';

const CURRENCIES = { reporting: 'USD', display: 'PKR' };

describe('pickEffectiveVersion (settings apply from a chosen month)', () => {
  const versions = [
    { effectiveFrom: '2026-01' as const, value: 'a' },
    { effectiveFrom: '2026-06' as const, value: 'b' },
  ];

  it('uses the latest version that started on or before the month', () => {
    expect(pickEffectiveVersion(versions, '2026-05')?.value).toBe('a');
    expect(pickEffectiveVersion(versions, '2026-06')?.value).toBe('b');
    expect(pickEffectiveVersion(versions, '2027-01')?.value).toBe('b');
  });

  it('has nothing for a month before the first version', () => {
    expect(pickEffectiveVersion(versions, '2025-12')).toBeNull();
  });
});

describe('currency conversion (one rate per month)', () => {
  it('converts PKR to USD by dividing by the month rate', () => {
    expect(toReportingCurrency('55600', 'PKR', '278', CURRENCIES).toNumber()).toBe(200);
    expect(toReportingCurrency('117', 'USD', null, CURRENCIES).toNumber()).toBe(117);
  });

  it('refuses a PKR amount without a rate and an unknown currency', () => {
    expect(() => toReportingCurrency('100', 'PKR', null, CURRENCIES)).toThrow(
      MissingExchangeRateError,
    );
    expect(() => toReportingCurrency('100', 'EUR', '278', CURRENCIES)).toThrow(RuleViolationError);
  });

  it('shows the display-currency value, or nothing without a rate', () => {
    expect(toDisplayCurrency('200', 'USD', '278', CURRENCIES)?.toNumber()).toBe(55600);
    expect(toDisplayCurrency('200', 'USD', null, CURRENCIES)).toBeNull();
  });
});

describe('resolveDefaultFee (project → client → platform)', () => {
  const platforms = [
    {
      id: 'upwork',
      feeVersions: [
        { effectiveFrom: '2026-01' as const, feePercent: '10' },
        { effectiveFrom: '2026-07' as const, feePercent: '15' },
      ],
    },
  ];
  const base = {
    projectPlatformId: null,
    projectFeeOverride: null,
    clientPlatformId: 'upwork',
    clientDefaultFee: null,
    platforms,
  };

  it('uses the platform fee effective in the booking month', () => {
    expect(resolveDefaultFee({ ...base, month: '2026-03' })).toEqual({
      platformId: 'upwork',
      feePercent: '10',
    });
    expect(resolveDefaultFee({ ...base, month: '2026-08' }).feePercent).toBe('15');
  });

  it('prefers a client default, then a project override', () => {
    expect(resolveDefaultFee({ ...base, clientDefaultFee: '5', month: '2026-03' }).feePercent).toBe(
      '5',
    );
    expect(
      resolveDefaultFee({
        ...base,
        clientDefaultFee: '5',
        projectFeeOverride: '0',
        month: '2026-03',
      }).feePercent,
    ).toBe('0');
  });

  it('charges no fee without a platform', () => {
    expect(resolveDefaultFee({ ...base, clientPlatformId: null, month: '2026-03' })).toEqual({
      platformId: null,
      feePercent: '0',
    });
  });
});

describe('receivable ageing', () => {
  it('counts days from the start of the booking month and buckets them', () => {
    const today = new Date('2026-03-15T00:00:00Z');
    expect(ageInDays('2026-03', today)).toBe(14);
    expect(ageingBucket(ageInDays('2026-03', today))).toBe(AGEING_BUCKET.DAYS_0_30);
    expect(ageingBucket(45)).toBe(AGEING_BUCKET.DAYS_31_60);
    expect(ageingBucket(75)).toBe(AGEING_BUCKET.DAYS_61_90);
    expect(ageingBucket(200)).toBe(AGEING_BUCKET.DAYS_OVER_90);
  });
});
