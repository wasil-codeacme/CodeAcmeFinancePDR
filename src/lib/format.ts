import { Decimal } from '@/lib/decimal';
import { MONEY_DECIMALS, PERCENT_DECIMALS, PERCENT_DIVISOR } from '@/lib/constants';

const BLANK = '—';
const THOUSANDS_GROUP = /\B(?=(\d{3})+(?!\d))/g;

/** Rounds half-up to cents only at display time; sums stay exact underneath. */
export function formatMoney(value: Decimal.Value | null | undefined): string {
  if (value === null || value === undefined) return BLANK;
  const rounded = new Decimal(value).toDecimalPlaces(MONEY_DECIMALS, Decimal.ROUND_HALF_UP);
  const sign = rounded.isNegative() && !rounded.isZero() ? '-' : '';
  const [integerPart = '0', fractionPart = ''] = rounded.abs().toFixed(MONEY_DECIMALS).split('.');
  return `${sign}${integerPart.replace(THOUSANDS_GROUP, ',')}.${fractionPart}`;
}

export function formatMoneyWithCode(
  value: Decimal.Value | null | undefined,
  currency: string,
): string {
  if (value === null || value === undefined) return BLANK;
  return `${formatMoney(value)} ${currency}`;
}

/** Formats a ratio (0.6425) as a percentage (64.3%). */
export function formatRatioAsPercent(ratio: Decimal.Value | null | undefined): string {
  if (ratio === null || ratio === undefined) return BLANK;
  const percent = new Decimal(ratio).times(PERCENT_DIVISOR);
  return `${percent.toFixed(PERCENT_DECIMALS, Decimal.ROUND_HALF_UP)}%`;
}

/** Formats a stored percent value (10.0000) as `10%`. */
export function formatPercentValue(percent: Decimal.Value | null | undefined): string {
  if (percent === null || percent === undefined) return BLANK;
  return `${new Decimal(percent).toDecimalPlaces(PERCENT_DECIMALS + 1).toString()}%`;
}
