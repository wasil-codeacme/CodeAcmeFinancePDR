'use client';

import { CalendarIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDateLabel, isIsoDate } from '@/lib/month';
import { cn } from '@/lib/utils';

const PAD_WIDTH = 2;

// react-day-picker is only needed once a date picker opens, so it is not in every form's bundle.
const Calendar = dynamic(
  () => import('@/components/ui/calendar').then((module) => module.Calendar),
  { ssr: false, loading: () => <div className="h-72 w-64" aria-busy="true" /> },
);

/** The calendar works in local dates; the app stores plain `YYYY-MM-DD` strings. */
function toLocalDate(isoDate: string): Date | undefined {
  if (!isIsoDate(isoDate)) return undefined;
  const [year = 0, month = 1, day = 1] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(PAD_WIDTH, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

type DatePickerProps = {
  id?: string;
  value: string;
  onChange: (isoDate: string) => void;
  invalid?: boolean;
  placeholder?: string;
};

export function DatePicker({
  id,
  value,
  onChange,
  invalid,
  placeholder = 'Pick a date',
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = toLocalDate(value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-invalid={invalid}
          className={cn('w-full justify-start font-normal', !selected && 'text-muted-foreground')}
        >
          <CalendarIcon />
          {selected ? formatDateLabel(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            if (date) onChange(toIsoDate(date));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
