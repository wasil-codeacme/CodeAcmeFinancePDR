'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { usePendingNavigation } from '@/components/layout/pending-navigation';
import { IconButton } from '@/components/shared/icon-button';
import { SEARCH_PARAM } from '@/lib/constants';
import { MonthSelect } from '@/components/shared/month-select';
import { type MonthKey, addMonths } from '@/lib/month';

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
      <IconButton
        variant="outline"
        size="icon"
        label="Previous month"
        onClick={() => goTo(addMonths(month, -1))}
      >
        <ChevronLeft />
      </IconButton>
      <MonthSelect value={month} onChange={goTo} className="w-40" />
      <IconButton
        variant="outline"
        size="icon"
        label="Next month"
        onClick={() => goTo(addMonths(month, 1))}
      >
        <ChevronRight />
      </IconButton>
    </div>
  );
}
