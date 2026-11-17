import { Decimal, type DecimalString } from '@/lib/decimal';
import { MissingExchangeRateError, RuleViolationError } from '@/server/errors';
import { MESSAGES } from '@/lib/messages';

export type CurrencyPair = { reporting: string; display: string };

/**
 * Converts an amount into the reporting currency (USD) using the month's single rate,
 * expressed as display units per reporting unit (e.g. 278 PKR per USD). PRD §6:
 * USD amount of a PKR expense = PKR ÷ that month's rate.
 */
export function toReportingCurrency(
  amount: DecimalString,
  currency: string,
  rate: DecimalString | null,
  currencies: CurrencyPair,
): Decimal {
  if (currency === currencies.reporting) return new Decimal(amount);
  if (currency !== currencies.display) {
    throw new RuleViolationError(MESSAGES.SETTINGS.CURRENCY_NOT_SUPPORTED);
  }
  if (rate === null) throw new MissingExchangeRateError();
  return new Decimal(amount).dividedBy(rate);
}

/** Display-currency value of an amount in an expense's own currency, or null without a rate. */
export function toDisplayCurrency(
  amount: DecimalString,
  currency: string,
  rate: DecimalString | null,
  currencies: CurrencyPair,
): Decimal | null {
  if (currency === currencies.display) return new Decimal(amount);
  if (rate === null) return null;
  return new Decimal(amount).times(rate);
}

/** Moves an amount between the two company currencies at the month's rate (accounts, transfers). */
export function convertCurrency(
  amount: DecimalString,
  from: string,
  to: string,
  rate: DecimalString | null,
  currencies: CurrencyPair,
): Decimal {
  if (from === to) return new Decimal(amount);
  const inReporting = toReportingCurrency(amount, from, rate, currencies);
  if (to === currencies.reporting) return inReporting;
  if (to !== currencies.display) {
    throw new RuleViolationError(MESSAGES.SETTINGS.CURRENCY_NOT_SUPPORTED);
  }
  if (rate === null) throw new MissingExchangeRateError();
  return inReporting.times(rate);
}

export function reportingToDisplay(amount: Decimal, rate: DecimalString | null): Decimal | null {
  return rate === null ? null : amount.times(rate);
}
