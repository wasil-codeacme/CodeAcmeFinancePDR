'use client';

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { IconButton } from '@/components/shared/icon-button';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MONTHS_PER_YEAR } from '@/lib/constants';
import { type MonthKey, formatMonthLabel, isMonthKey } from '@/lib/month';
import { cn } from '@/lib/utils';

const MONTH_NAMES = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
const SHORT_MONTHS = Array.from({ length: MONTHS_PER_YEAR }, (_, index) =>
  MONTH_NAMES.format(new Date(Date.UTC(2000, index, 1))),
);
const PAD_WIDTH = 2;

function yearOf(month: string): number {
  return Number(month.slice(0, 4)) || new Date().getFullYear();
}

type MonthSelectProps = {
  id?: string;
  value: string;
  onChange: (month: MonthKey) => void;
  invalid?: boolean;
  placeholder?: string;
  className?: string;
};

/** A shadcn month picker: a year switcher over a grid of the twelve months. */
export function MonthSelect({
  id,
  value,
  onChange,
  invalid,
  placeholder = 'Pick a month',
  className,
}: MonthSelectProps) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => yearOf(value));
  const hasValue = isMonthKey(value);
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setYear(yearOf(value));
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-invalid={invalid}
          className={cn(
            'w-full justify-start font-normal',
            !hasValue && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarDays />
          {hasValue ? formatMonthLabel(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="mb-2 flex items-center justify-between">
          <IconButton
            type="button"
            variant="ghost"
            size="icon-sm"
            label="Previous year"
            onClick={() => setYear(year - 1)}
          >
            <ChevronLeft />
          </IconButton>
          <span className="text-sm font-medium tabular-nums">{year}</span>
          <IconButton
            type="button"
            variant="ghost"
            size="icon-sm"
            label="Next year"
            onClick={() => setYear(year + 1)}
          >
            <ChevronRight />
          </IconButton>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {SHORT_MONTHS.map((label, index) => {
            const key = `${year}-${String(index + 1).padStart(PAD_WIDTH, '0')}`;
            const selected = key === value;
            return (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={selected ? 'default' : 'ghost'}
                onClick={() => {
                  if (isMonthKey(key)) onChange(key);
                  setOpen(false);
                }}
              >
                {label}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
