import type { ExpenseFormOptions } from '@/components/expenses/expense-form';
import { ExpenseRowActions } from '@/components/expenses/expense-row-actions';
import { EmptyState } from '@/components/shared/empty-state';
import { Money } from '@/components/shared/money';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FundingSource } from '@/generated/prisma/enums';
import { FUNDING_SOURCE_LABEL } from '@/lib/labels';
import { formatDateLabel } from '@/lib/month';
import type { ExpenseCategoryGroup, ExpenseRow } from '@/types/expense';

type ExpenseGroupsProps = {
  groups: ExpenseCategoryGroup[];
  options: ExpenseFormOptions;
  canDeleteConfirmed: boolean;
};

function FundingCell({ row }: { row: ExpenseRow }) {
  if (row.fundingSource === FundingSource.COMPANY)
    return <span>{FUNDING_SOURCE_LABEL.COMPANY}</span>;
  return (
    <Badge variant="secondary">{row.fundingPartnerName ?? FUNDING_SOURCE_LABEL.EXTERNAL}</Badge>
  );
}

/** PRD §5.3: the month grouped by category, with subtotals in both currencies. */
export function ExpenseGroups({ groups, options, canDeleteConfirmed }: ExpenseGroupsProps) {
  const { reporting, display } = options.currencies;
  const withRows = groups.filter((group) => group.rows.length > 0);
  if (withRows.length === 0) {
    return (
      <EmptyState
        title="No confirmed expenses this month"
        description="Add one, or generate the recurring drafts."
      />
    );
  }
  return (
    <div className="bg-card overflow-x-auto rounded-xl border shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">{display}</TableHead>
            <TableHead className="text-right">{reporting}</TableHead>
            <TableHead>Funding</TableHead>
            <TableHead>Paid from</TableHead>
            <TableHead className="sr-only">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {withRows.map((group) => (
            <GroupRows
              key={group.categoryId}
              group={group}
              options={options}
              canDeleteConfirmed={canDeleteConfirmed}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function GroupRows({
  group,
  options,
  canDeleteConfirmed,
}: { group: ExpenseCategoryGroup } & Omit<ExpenseGroupsProps, 'groups'>) {
  return (
    <>
      <TableRow className="bg-muted/50 hover:bg-muted/50">
        <TableCell colSpan={7} className="text-xs font-semibold tracking-wide uppercase">
          {group.categoryName}
        </TableCell>
      </TableRow>
      {group.rows.map((row) => (
        <TableRow key={row.id}>
          <TableCell className="min-w-48">
            <div className="font-medium">{row.item}</div>
            {row.payeeName || row.notes ? (
              <div className="text-muted-foreground text-xs">
                {[row.payeeName, row.notes].filter(Boolean).join(' · ')}
              </div>
            ) : null}
          </TableCell>
          <TableCell className="whitespace-nowrap">{formatDateLabel(row.expenseDate)}</TableCell>
          <TableCell className="text-right">
            <Money value={row.displayAmount} currency={options.currencies.display} />
          </TableCell>
          <TableCell className="text-right">
            <Money value={row.reportingAmount} />
          </TableCell>
          <TableCell>
            <FundingCell row={row} />
          </TableCell>
          <TableCell className="text-muted-foreground">{row.paidFromAccountName ?? '—'}</TableCell>
          <TableCell>
            <ExpenseRowActions
              expense={row}
              options={options}
              canDeleteConfirmed={canDeleteConfirmed}
            />
          </TableCell>
        </TableRow>
      ))}
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={2} className="text-muted-foreground text-right text-xs">
          {group.categoryName} total
        </TableCell>
        <TableCell className="text-right font-medium">
          <Money value={group.displayTotal} currency={options.currencies.display} />
        </TableCell>
        <TableCell className="text-right font-medium">
          <Money value={group.companyTotal} />
          {group.externalTotal !== '0' ? (
            <span className="text-muted-foreground block text-xs">
              + <Money value={group.externalTotal} /> external
            </span>
          ) : null}
        </TableCell>
        <TableCell colSpan={3} />
      </TableRow>
    </>
  );
}
