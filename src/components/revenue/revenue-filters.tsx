'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { usePendingNavigation } from '@/components/layout/pending-navigation';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SEARCH_PARAM } from '@/lib/constants';
import { PROJECT_STATUS_LABEL, optionsFrom } from '@/lib/labels';

const ALL = '__all__';

type FilterOption = { value: string; label: string };

type RevenueFiltersProps = { clients: FilterOption[]; platforms: FilterOption[] };

/** Filters live in the URL so a filtered view can be bookmarked or shared. */
export function RevenueFilters({ clients, platforms }: RevenueFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { startTransition } = usePendingNavigation();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== ALL) params.set(key, value);
    else params.delete(key);
    if (params.toString() === searchParams.toString()) return;
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  }

  const selects: { key: string; label: string; options: FilterOption[] }[] = [
    { key: SEARCH_PARAM.CLIENT, label: 'All clients', options: clients },
    { key: SEARCH_PARAM.PLATFORM, label: 'All platforms', options: platforms },
    { key: SEARCH_PARAM.STATUS, label: 'All statuses', options: optionsFrom(PROJECT_STATUS_LABEL) },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <Input
        type="search"
        placeholder="Search client or project"
        defaultValue={searchParams.get(SEARCH_PARAM.QUERY) ?? ''}
        aria-label="Search"
        onKeyDown={(event) => {
          if (event.key === 'Enter') setParam(SEARCH_PARAM.QUERY, event.currentTarget.value.trim());
        }}
        onBlur={(event) => setParam(SEARCH_PARAM.QUERY, event.currentTarget.value.trim())}
      />
      {selects.map((select) => (
        <Select
          key={select.key}
          value={searchParams.get(select.key) ?? ALL}
          onValueChange={(value) => setParam(select.key, value)}
        >
          <SelectTrigger className="w-full" aria-label={select.label}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{select.label}</SelectItem>
            {select.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  );
}
