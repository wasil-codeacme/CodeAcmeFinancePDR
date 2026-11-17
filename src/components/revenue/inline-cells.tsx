'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type InlineTextCellProps = {
  value: string;
  label: string;
  pattern?: RegExp;
  numeric?: boolean;
  disabled?: boolean;
  className?: string;
  onCommit: (value: string) => void;
};

/**
 * Spreadsheet-style cell: edit in place, saved on blur or Enter. Keyed by its value so a
 * server refresh resets it; invalid input is rejected before any request is made.
 */
export function InlineTextCell({
  value,
  label,
  pattern,
  numeric,
  disabled,
  className,
  onCommit,
}: InlineTextCellProps) {
  return (
    <Input
      key={value}
      aria-label={label}
      defaultValue={value}
      disabled={disabled}
      inputMode={numeric ? 'decimal' : undefined}
      className={cn('h-8 min-w-20 px-2', numeric && 'text-right tabular-nums', className)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') {
          event.currentTarget.value = value;
          event.currentTarget.blur();
        }
      }}
      onBlur={(event) => {
        const next = event.currentTarget.value.trim().replaceAll(',', '');
        if (next === value) return;
        if (pattern && !pattern.test(next)) {
          event.currentTarget.value = value;
          return;
        }
        onCommit(next);
      }}
    />
  );
}

type InlineSelectCellProps<TValue extends string> = {
  value: TValue;
  label: string;
  options: { value: TValue; label: string }[];
  disabled?: boolean;
  onCommit: (value: TValue) => void;
};

export function InlineSelectCell<TValue extends string>({
  value,
  label,
  options,
  disabled,
  onCommit,
}: InlineSelectCellProps<TValue>) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next: TValue) => next !== value && onCommit(next)}
    >
      <SelectTrigger size="sm" aria-label={label} className="min-w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
