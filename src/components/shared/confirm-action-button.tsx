'use client';

import type { ReactNode } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { MESSAGES } from '@/lib/messages';

type ConfirmActionButtonProps = {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
};

/** Destructive actions ask first (the lead's "are you sure?" confirmation). */
export function ConfirmActionButton({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
}: ConfirmActionButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{MESSAGES.COMMON.CANCEL}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
