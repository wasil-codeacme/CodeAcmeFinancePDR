'use client';

import { InlineTextCell } from '@/components/revenue/inline-cells';
import { SectionCard } from '@/components/shared/section-card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useActionRunner } from '@/hooks/use-action-runner';
import { SALES_CHANNEL_LABEL } from '@/lib/labels';
import { MESSAGES } from '@/lib/messages';
import { type MonthKey, formatLongMonthLabel } from '@/lib/month';
import { saveSalesActivity } from '@/server/actions/sales.actions';
import type { SalesActivityRecord } from '@/server/repositories/sales-activity.repository';

const WHOLE_NUMBER_PATTERN = /^\d+$/;

const COUNT_FIELDS = [
  { field: 'interestedResponses', label: 'Interested responses' },
  { field: 'leadsClosed', label: 'Leads closed' },
  { field: 'callsMade', label: 'Calls made' },
] as const;

type SalesActivityEditorProps = { month: MonthKey; rows: SalesActivityRecord[]; canEdit: boolean };

/** PRD §5.8: the month's interested responses, leads closed and calls made per channel. */
export function SalesActivityEditor({ month, rows, canEdit }: SalesActivityEditorProps) {
  const { run, isPending } = useActionRunner();
  return (
    <SectionCard
      title={`Sales activity — ${formatLongMonthLabel(month)}`}
      description="Type the counts per channel; each saves as you leave the box. Pick a single month above to enter another month."
    >
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Channel</TableHead>
              {COUNT_FIELDS.map(({ field, label }) => (
                <TableHead key={field} className="text-right">
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.channel}>
                <TableCell className="font-medium">{SALES_CHANNEL_LABEL[row.channel]}</TableCell>
                {COUNT_FIELDS.map(({ field, label }) => (
                  <TableCell key={field} className="text-right">
                    <InlineTextCell
                      numeric
                      label={`${label}, ${SALES_CHANNEL_LABEL[row.channel]}`}
                      value={String(row[field])}
                      pattern={WHOLE_NUMBER_PATTERN}
                      disabled={!canEdit || isPending}
                      className="ml-auto w-20 min-w-0"
                      onCommit={(value) =>
                        run(
                          () => saveSalesActivity({ ...row, month, [field]: Number(value) }),
                          MESSAGES.COMMON.SAVED,
                        )
                      }
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SectionCard>
  );
}
