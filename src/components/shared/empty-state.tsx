import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description ? <p className="text-muted-foreground max-w-sm text-sm">{description}</p> : null}
      {action}
    </div>
  );
}
