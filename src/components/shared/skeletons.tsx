import { Skeleton } from '@/components/ui/skeleton';

const DEFAULT_ROWS = 6;
const DEFAULT_STATS = 4;

/** Month picker and action buttons while a page's data loads. */
export function ControlsSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Skeleton className="h-8 w-56 rounded-lg" />
      <Skeleton className="h-8 w-32 rounded-lg" />
    </div>
  );
}

export function StatCardsSkeleton({ count = DEFAULT_STATS }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = DEFAULT_ROWS }: { rows?: number }) {
  return (
    <div className="bg-card space-y-2 rounded-xl border p-3">
      <Skeleton className="h-8 w-full rounded-md" />
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full rounded-md" />
      ))}
    </div>
  );
}

export function CardListSkeleton({ count = DEFAULT_STATS }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-40 rounded-xl" />
      ))}
    </div>
  );
}

export function FormCardSkeleton() {
  return <Skeleton className="h-64 rounded-xl" />;
}
