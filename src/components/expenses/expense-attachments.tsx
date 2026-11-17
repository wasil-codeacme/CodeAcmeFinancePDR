'use client';

import { FileText, Paperclip, Trash2, Upload } from 'lucide-react';
import { type FormEvent, useRef } from 'react';

import { ConfirmActionButton } from '@/components/shared/confirm-action-button';
import { FormDialog } from '@/components/shared/form-dialog';
import { IconButton } from '@/components/shared/icon-button';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useActionRunner } from '@/hooks/use-action-runner';
import { formatFileSize } from '@/lib/format';
import { MESSAGES } from '@/lib/messages';
import { ROUTES } from '@/lib/routes';
import { addExpenseAttachment, removeExpenseAttachment } from '@/server/actions/expense.actions';
import type { ExpenseRecord } from '@/types/expense';

const ACCEPTED_TYPES = 'application/pdf,image/png,image/jpeg,image/webp';

function AttachmentList({ expense }: { expense: ExpenseRecord }) {
  const { run, isPending } = useActionRunner();
  if (expense.attachments.length === 0) {
    return <p className="text-muted-foreground text-sm">No files yet.</p>;
  }
  return (
    <ul className="divide-y rounded-lg border">
      {expense.attachments.map((attachment) => (
        <li key={attachment.id} className="flex items-center justify-between gap-2 px-3 py-2">
          <a
            href={ROUTES.EXPENSE_ATTACHMENT(attachment.id)}
            target="_blank"
            rel="noopener"
            className="flex min-w-0 items-center gap-2 text-sm hover:underline"
          >
            <FileText className="text-muted-foreground size-4 shrink-0" />
            <span className="truncate">{attachment.fileName}</span>
            <span className="text-muted-foreground shrink-0 text-xs">
              {formatFileSize(attachment.size)}
            </span>
          </a>
          <ConfirmActionButton
            title="Remove this file?"
            description="It is removed from the expense; the audit log keeps a record."
            confirmLabel={MESSAGES.COMMON.DELETE}
            onConfirm={() =>
              run(
                () => removeExpenseAttachment({ id: attachment.id }),
                MESSAGES.EXPENSE.ATTACHMENT_REMOVED,
              )
            }
            trigger={
              <IconButton size="icon-sm" variant="ghost" label="Remove file" disabled={isPending}>
                <Trash2 />
              </IconButton>
            }
          />
        </li>
      ))}
    </ul>
  );
}

function UploadForm({ expenseId }: { expenseId: string }) {
  const { run, isPending } = useActionRunner();
  const input = useRef<HTMLInputElement>(null);

  function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = input.current?.files?.[0];
    if (!file) return;
    run(
      () => addExpenseAttachment({ expenseId, file }),
      MESSAGES.EXPENSE.ATTACHMENT_ADDED,
      () => {
        if (input.current) input.current.value = '';
      },
    );
  }

  return (
    <form onSubmit={upload} className="grid gap-3">
      <Field>
        <FieldLabel htmlFor={`attachment-${expenseId}`}>Add a file</FieldLabel>
        <Input
          id={`attachment-${expenseId}`}
          ref={input}
          type="file"
          accept={ACCEPTED_TYPES}
          required
        />
        <FieldDescription>PDF, PNG, JPEG or WebP, up to 5 MB.</FieldDescription>
      </Field>
      <Button type="submit" disabled={isPending}>
        <Upload /> {isPending ? 'Attaching…' : 'Attach'}
      </Button>
    </form>
  );
}

/** PRD §5.3: receipts and invoices on any expense, opened in a new tab. */
export function ExpenseAttachmentsButton({ expense }: { expense: ExpenseRecord }) {
  const count = expense.attachments.length;
  return (
    <FormDialog
      title="Attachments"
      description={expense.item}
      trigger={
        <IconButton
          size="icon-sm"
          variant="ghost"
          label={count > 0 ? `${count} attachment(s)` : 'Attach a file'}
          className="relative"
        >
          <Paperclip />
          {count > 0 ? (
            <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full text-[9px] font-semibold">
              {count}
            </span>
          ) : null}
        </IconButton>
      }
    >
      {() => (
        <div className="grid gap-5">
          <AttachmentList expense={expense} />
          <UploadForm expenseId={expense.id} />
        </div>
      )}
    </FormDialog>
  );
}
