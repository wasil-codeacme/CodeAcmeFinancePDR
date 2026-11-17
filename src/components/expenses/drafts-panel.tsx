import type { ExpenseFormOptions } from '@/components/expenses/expense-form';
import {
  ExpenseRowActions,
  type ExpenseRowCallbacks,
} from '@/components/expenses/expense-row-actions';
import { ConfirmAllDraftsButton } from '@/components/expenses/expense-toolbar';
import { Money } from '@/components/shared/money';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { MonthKey } from '@/lib/month';
import type { ExpenseRow } from '@/types/expense';

type DraftsPanelProps = ExpenseRowCallbacks & {
  drafts: ExpenseRow[];
  month: MonthKey;
  options: ExpenseFormOptions;
};

/** PRD §5.3: drafts from recurring templates wait here; each is confirmed or adjusted first. */
export function DraftsPanel({ drafts, month, options, ...callbacks }: DraftsPanelProps) {
  if (drafts.length === 0) return null;
  return (
    <Card className="border-amber-300/60 bg-amber-50/50 dark:bg-amber-950/10">
      <CardHeader>
        <CardTitle>{drafts.length} drafts to confirm</CardTitle>
        <CardDescription>
          Not counted in the P&amp;L until confirmed. Adjust any amount first.
        </CardDescription>
        <CardAction>
          <ConfirmAllDraftsButton month={month} />
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {drafts.map((draft) => (
            <li key={draft.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="grid gap-0.5">
                <span className="text-sm font-medium">{draft.item}</span>
                <span className="text-muted-foreground text-xs">{draft.categoryName}</span>
              </div>
              <div className="flex items-center gap-3">
                <Money value={draft.amount} currency={draft.currency} />
                <ExpenseRowActions
                  expense={draft}
                  options={options}
                  canDeleteConfirmed={false}
                  {...callbacks}
                />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
