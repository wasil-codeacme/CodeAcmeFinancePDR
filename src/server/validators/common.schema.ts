import { z } from 'zod';

import { MAX_MONEY_AMOUNT, MAX_NAME_LENGTH, MAX_NOTES_LENGTH, MAX_PERCENT } from '@/lib/constants';
import { isIsoDate, isMonthKey, type MonthKey } from '@/lib/month';

const MONEY_PATTERN = /^-?\d+(\.\d{1,2})?$/;
const PERCENT_PATTERN = /^\d+(\.\d{1,4})?$/;
const RATE_PATTERN = /^\d+(\.\d{1,4})?$/;

/** Accepts `1,234.50` as typed in a form and normalises it to `1234.50`. */
const decimalText = z
  .string()
  .trim()
  .transform((value) => value.replaceAll(',', ''));

export const idSchema = z.string().min(1).max(64);

export const monthKeySchema = z.custom<MonthKey>(
  (value) => typeof value === 'string' && isMonthKey(value),
  'Use a month like 2026-01.',
);

export const isoDateSchema = z.string().refine(isIsoDate, 'Use a date like 2026-01-31.');

/** A date a form may leave blank; blank and missing both mean null. */
export const optionalIsoDateSchema = z
  .union([z.literal(''), isoDateSchema, z.null()])
  .optional()
  .transform((value) => (value ? value : null));

export const nameSchema = z.string().trim().min(1, 'Required.').max(MAX_NAME_LENGTH);

export const optionalTextSchema = z
  .string()
  .trim()
  .max(MAX_NOTES_LENGTH)
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .optional()
  .transform((value) => value ?? null);

export const optionalShortTextSchema = z
  .string()
  .trim()
  .max(MAX_NAME_LENGTH)
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .optional()
  .transform((value) => value ?? null);

export const optionalIdSchema = z
  .string()
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .optional()
  .transform((value) => value ?? null);

export const moneySchema = decimalText
  .pipe(z.string().regex(MONEY_PATTERN, 'Enter an amount like 1250.50.'))
  .refine((value) => Math.abs(Number(value)) <= MAX_MONEY_AMOUNT, 'Amount is too large.');

export const positiveMoneySchema = moneySchema.refine(
  (value) => Number(value) > 0,
  'Must be more than 0.',
);

export const percentSchema = decimalText
  .pipe(z.string().regex(PERCENT_PATTERN, 'Enter a percentage like 10 or 12.5.'))
  .refine((value) => Number(value) <= MAX_PERCENT, 'Cannot exceed 100%.');

export const rateSchema = decimalText
  .pipe(z.string().regex(RATE_PATTERN, 'Enter a rate like 278.50.'))
  .refine((value) => Number(value) > 0, 'Must be more than 0.');

export const currencyCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'Use a 3-letter code like USD.');
