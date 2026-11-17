import Decimal from 'decimal.js';

import { PERCENT_DIVISOR } from '@/lib/constants';

/** An exact decimal serialised as a string, safe to pass from server to client. */
export type DecimalString = string;

export { Decimal };

export const ZERO = new Decimal(0);

export function toDecimal(value: Decimal.Value): Decimal {
  return new Decimal(value);
}

export function sumDecimals(values: readonly Decimal[]): Decimal {
  return values.reduce((total, value) => total.plus(value), ZERO);
}

/** `amount × percent / 100`, where percent is stored as e.g. `10` for 10%. */
export function percentOf(amount: Decimal, percent: Decimal.Value): Decimal {
  return amount.times(percent).dividedBy(PERCENT_DIVISOR);
}

/** `numerator ÷ denominator`, or null when the denominator is zero (blank margin). */
export function ratioOrNull(numerator: Decimal, denominator: Decimal): Decimal | null {
  return denominator.isZero() ? null : numerator.dividedBy(denominator);
}
