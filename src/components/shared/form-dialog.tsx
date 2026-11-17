'use client';

import { type ReactNode, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type FormDialogProps = {
  trigger: ReactNode;
  title: string;
  description?: string;
  children: (close: () => void) => ReactNode;
};

/** A dialog that hosts a form and hands it a `close` callback for when the save succeeds. */
export function FormDialog({ trigger, title, description, children }: FormDialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {open ? children(() => setOpen(false)) : null}
      </DialogContent>
    </Dialog>
  );
}
