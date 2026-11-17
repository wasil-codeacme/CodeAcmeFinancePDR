import type { Decimal } from '@/lib/decimal';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

type MoneyProps = {
  value: Decimal.Value | null | undefined;
  currency?: string;
  className?: string;
  emphasizeNegative?: boolean;
};

/** Right-aligned-friendly money: tabular digits, cents, negatives in red when asked. */
export function Money({ value, currency, className, emphasizeNegative = false }: MoneyProps) {
  const text = formatMoney(value);
  const isNegative = text.startsWith('-');
  return (
    <span
      className={cn(
        'tabular-nums',
        emphasizeNegative && isNegative && 'text-destructive',
        className,
      )}
    >
      {text}
      {currency && value !== null && value !== undefined ? (
        <span className="text-muted-foreground ml-1 text-xs">{currency}</span>
      ) : null}
    </span>
  );
}
