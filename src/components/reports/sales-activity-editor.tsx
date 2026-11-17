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
import { useOptimisticList } from '@/hooks/use-optimistic-list';
import { SALES_CHANNEL_LABEL } from '@/lib/labels';
import { MESSAGES } from '@/lib/messages';
import { type MonthKey, formatLongMonthLabel } from '@/lib/month';
import { saveSalesActivity } from '@/server/actions/sales.actions';
import type { SalesActivityRecord } from '@/server/repositories/sales-activity.repository';

const WHOLE_NUMBER_PATTERN = /^\d+$/;

const COUNT_FIELDS = [
  { field: 'interestedResponses', label: 'Interested responses', short: 'Interested' },
  { field: 'leadsClosed', label: 'Leads closed', short: 'Leads' },
  { field: 'callsMade', label: 'Calls made', short: 'Calls' },
] as const;

type SalesActivityEditorProps = { month: MonthKey; rows: SalesActivityRecord[]; canEdit: boolean };

/** PRD §5.8: the month's interested responses, leads closed and calls made per channel. */
export function SalesActivityEditor({ month, rows, canEdit }: SalesActivityEditorProps) {
  // Each save sends the whole row, so a count typed while another saves keeps the earlier edit.
  const { rows: optimisticRows, mutate } = useOptimisticList(
    rows.map((row) => ({ ...row, id: row.channel })),
  );
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
              {COUNT_FIELDS.map(({ field, label, short }) => (
                <TableHead key={field} className="px-1 text-right sm:px-2">
                  <span className="sm:hidden">{short}</span>
                  <span className="hidden sm:inline">{label}</span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {optimisticRows.map((row) => (
              <TableRow key={row.channel}>
                <TableCell className="font-medium">{SALES_CHANNEL_LABEL[row.channel]}</TableCell>
                {COUNT_FIELDS.map(({ field, label }) => (
                  <TableCell key={field} className="px-1 text-right sm:px-2">
                    <InlineTextCell
                      numeric
                      label={`${label}, ${SALES_CHANNEL_LABEL[row.channel]}`}
                      value={String(row[field])}
                      pattern={WHOLE_NUMBER_PATTERN}
                      disabled={!canEdit}
                      className="ml-auto w-14 min-w-0 sm:w-20"
                      onCommit={(value) =>
                        mutate(
                          { type: 'update', id: row.channel, patch: { [field]: Number(value) } },
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
