'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { usePendingNavigation } from '@/components/layout/pending-navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SEARCH_PARAM } from '@/lib/constants';
import { type MonthKey, addMonths, formatLongMonthLabel, isMonthKey } from '@/lib/month';

/** Month filter kept in the URL (`?month=2026-01`) so views are linkable and shareable. */
export function MonthPicker({ month }: { month: MonthKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { startTransition } = usePendingNavigation();

  // A shared transition keeps the picker responsive while only the data sections skeleton.
  function goTo(next: MonthKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(SEARCH_PARAM.MONTH, next);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        aria-label="Previous month"
        onClick={() => goTo(addMonths(month, -1))}
      >
        <ChevronLeft />
      </Button>
      <Input
        type="month"
        aria-label={formatLongMonthLabel(month)}
        value={month}
        className="w-40"
        onChange={(event) => {
          if (isMonthKey(event.target.value)) goTo(event.target.value);
        }}
      />
      <Button
        variant="outline"
        size="icon"
        aria-label="Next month"
        onClick={() => goTo(addMonths(month, 1))}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
