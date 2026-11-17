'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';

import type { ActionResponse } from '@/types/action-response';

/** Runs a one-click Server Action (confirm, delete, generate…) with a toast for its outcome. */
export function useActionRunner() {
  const [isPending, startTransition] = useTransition();

  function run<TResult>(
    action: () => Promise<ActionResponse<TResult>>,
    successMessage: string | ((data: TResult) => string),
    onSuccess?: (data: TResult) => void,
  ) {
    startTransition(async () => {
      const result = await action();
      if (result.error !== undefined) {
        toast.error(result.error);
        return;
      }
      toast.success(
        typeof successMessage === 'function' ? successMessage(result.data) : successMessage,
      );
      onSuccess?.(result.data);
    });
  }

  return { run, isPending };
}
