'use client';

import { Copy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useActionRunner } from '@/hooks/use-action-runner';
import { MESSAGES } from '@/lib/messages';
import type { MonthKey } from '@/lib/month';
import { copyRevenueFromLastMonth } from '@/server/actions/books.actions';

export function CopyLastMonthButton({ month }: { month: MonthKey }) {
  const { run, isPending } = useActionRunner();
  return (
    <Button
      variant="outline"
      disabled={isPending}
      onClick={() =>
        run(
          () => copyRevenueFromLastMonth({ month }),
          (created: number) =>
            created > 0
              ? `${created} draft ${created === 1 ? 'entry' : 'entries'} created.`
              : MESSAGES.REVENUE.DRAFTS_CREATED,
        )
      }
    >
      <Copy /> Copy last month
    </Button>
  );
}
