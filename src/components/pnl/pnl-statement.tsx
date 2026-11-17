import type { ReactNode } from 'react';

import { Money } from '@/components/shared/money';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import type { Decimal } from '@/lib/decimal';
import { formatRatioAsPercent } from '@/lib/format';
import { PNL_LINE_LABEL } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { MonthlyPnl } from '@/server/domain/pnl';

type LineProps = {
  label: ReactNode;
  value: Decimal | null;
  indent?: boolean;
  strong?: boolean;
  muted?: boolean;
  note?: ReactNode;
};

function Line({ label, value, indent, strong, muted, note }: LineProps) {
  return (
    <TableRow className={cn(strong && 'bg-muted/40 hover:bg-muted/40')}>
      <TableCell
        className={cn(
          indent && 'pl-8',
          strong && 'font-semibold',
          muted && 'text-muted-foreground',
        )}
      >
        {label}
      </TableCell>
      <TableCell className="text-muted-foreground w-24 text-right text-xs">{note}</TableCell>
      <TableCell className={cn('w-40 text-right', strong && 'font-semibold')}>
        <Money value={value} emphasizeNegative={strong} />
      </TableCell>
    </TableRow>
  );
}

/** The workbook's P&L block, with every expense category under the P&L line it maps to. */
export function PnlStatement({ pnl, currency }: { pnl: MonthlyPnl; currency: string }) {
  const externalLines = pnl.expenseLines.filter((line) => !line.external.isZero());
  return (
    <div className="bg-card overflow-x-auto rounded-xl border shadow-xs">
      <Table>
        <TableBody>
          <Line label={`Gross revenue (${currency})`} value={pnl.grossRevenue} />
          <Line label="(−) Platform fees" value={pnl.platformFees.negated()} indent muted />
          {pnl.receivableAdjustments.isZero() ? null : (
            <Line
              label="(−) Receivables reduced or written off"
              value={pnl.receivableAdjustments.negated()}
              indent
              muted
            />
          )}
          <Line label="Net revenue" value={pnl.netRevenue} strong />
          {pnl.expenseLines.map((line) => (
            <PnlLineRows key={line.pnlLine} label={PNL_LINE_LABEL[line.pnlLine]} line={line} />
          ))}
          <Line label="Total company expense" value={pnl.totalCompanyExpense.negated()} strong />
          <Line
            label="Net profit (company only)"
            value={pnl.netProfitCompany}
            strong
            note={formatRatioAsPercent(pnl.marginCompany)}
          />
          {externalLines.map((line) => (
            <Line
              key={line.pnlLine}
              label={`(−) ${PNL_LINE_LABEL[line.pnlLine]} — externally funded`}
              value={line.external.negated()}
              indent
              muted
            />
          ))}
          <Line label="Total external funding" value={pnl.totalExternalFunding.negated()} />
          <Line
            label="Net profit (incl. external)"
            value={pnl.netProfitInclExternal}
            strong
            note={formatRatioAsPercent(pnl.marginInclExternal)}
          />
        </TableBody>
      </Table>
    </div>
  );
}

function PnlLineRows({ label, line }: { label: string; line: MonthlyPnl['expenseLines'][number] }) {
  if (line.categories.length === 0) return null;
  return (
    <>
      <Line label={`(−) ${label}`} value={line.company.negated()} />
      {line.categories.length > 1
        ? line.categories.map((category) => (
            <Line
              key={category.id}
              label={category.name}
              value={category.company.negated()}
              indent
              muted
            />
          ))
        : null}
    </>
  );
}
