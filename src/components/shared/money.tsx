import { DEFAULT_REPORTING_CURRENCY } from '@/lib/constants';
import type { Decimal } from '@/lib/decimal';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

type MoneyProps = {
  value: Decimal.Value | null | undefined;
  /** Defaults to the reporting currency; pass the display currency for PKR figures. */
  currency?: string;
  className?: string;
  emphasizeNegative?: boolean;
};

/** Money with its currency symbol and tabular digits; negatives in red when asked. */
export function Money({
  value,
  currency = DEFAULT_REPORTING_CURRENCY,
  className,
  emphasizeNegative = false,
}: MoneyProps) {
  const text = formatCurrency(value, currency);
  return (
    <span
      className={cn(
        'whitespace-nowrap tabular-nums',
        emphasizeNegative && text.startsWith('-') && 'text-destructive',
        className,
      )}
    >
      {text}
    </span>
  );
}
