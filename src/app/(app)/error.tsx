'use client';

import { RotateCcw, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { MESSAGES } from '@/lib/messages';

export default function AppError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <Empty className="mt-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TriangleAlert />
        </EmptyMedia>
        <EmptyTitle>Something went wrong</EmptyTitle>
        <EmptyDescription>{MESSAGES.COMMON.UNEXPECTED_ERROR}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={() => retry()}>
          <RotateCcw />
          Try again
        </Button>
      </EmptyContent>
    </Empty>
  );
}
