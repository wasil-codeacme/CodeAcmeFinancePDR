'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { type DefaultValues, type FieldValues, type Path, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

import type { ActionResponse } from '@/types/action-response';

type ActionFormOptions<TInput extends FieldValues, TOutput, TResult> = {
  schema: z.ZodType<TOutput, TInput>;
  defaultValues: DefaultValues<TInput>;
  action: (values: TOutput) => Promise<ActionResponse<TResult>>;
  successMessage: string;
  onSuccess?: (data: TResult) => void;
  resetOnSuccess?: boolean;
};

/**
 * A React Hook Form wired to a Server Action: validates on the client for fast feedback,
 * shows server field errors on their inputs, and toasts the outcome of every write.
 */
export function useActionForm<TInput extends FieldValues, TOutput, TResult>(
  options: ActionFormOptions<TInput, TOutput, TResult>,
) {
  const form = useForm<TInput, unknown, TOutput>({
    resolver: zodResolver(options.schema),
    defaultValues: options.defaultValues,
  });
  const [isPending, startTransition] = useTransition();

  const submit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await options.action(values);
      if (result.error !== undefined) {
        for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
          const message = messages?.[0];
          // Server field names come from the same schema as the form's, so they are its paths.
          if (message) form.setError(field as Path<TInput>, { message });
        }
        toast.error(result.error);
        return;
      }
      toast.success(options.successMessage);
      if (options.resetOnSuccess) form.reset(options.defaultValues);
      options.onSuccess?.(result.data);
    }),
  );

  return { form, submit, isPending };
}
