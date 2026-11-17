'use client';

import { useOptimistic, useTransition } from 'react';
import { toast } from 'sonner';

import { type ListChange, applyListChanges } from '@/lib/optimistic-list';
import type { ActionResponse } from '@/types/action-response';

/**
 * A list that changes the moment the user acts, then catches up with the server.
 *
 * `mutate` applies the change at once and runs the Server Action in a transition. On
 * success the action's refreshed page replaces the optimistic rows in the same render, so
 * nothing flickers; on failure a toast explains why and the rows roll back by themselves.
 * Rows stay editable while earlier saves are still in flight.
 */
export function useOptimisticList<TItem extends { id: string }>(items: TItem[]) {
  const [rows, applyChange] = useOptimistic(
    items,
    (current: TItem[], changes: ListChange<TItem> | ListChange<TItem>[]) =>
      applyListChanges(current, changes),
  );
  const [isPending, startTransition] = useTransition();

  function mutate<TResult>(
    changes: ListChange<TItem> | ListChange<TItem>[],
    action: () => Promise<ActionResponse<TResult>>,
    successMessage: string,
  ) {
    startTransition(async () => {
      applyChange(changes);
      const result = await action();
      if (result.error !== undefined) toast.error(result.error);
      else toast.success(successMessage);
    });
  }

  return { rows, mutate, isPending };
}
