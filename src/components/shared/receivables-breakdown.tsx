import { Money } from '@/components/shared/money';
import { Card, CardContent } from '@/components/ui/card';
import { formatRatioAsPercent } from '@/lib/format';
import type { ReceivableTotalsView } from '@/types/revenue';

/** The workbook's "Receivables breakdown" block, as a row of figures. */
export function ReceivablesBreakdown({ totals }: { totals: ReceivableTotalsView }) {
  const figures = [
    { label: 'Net booked', value: totals.netBooked },
    { label: 'Received', value: totals.received },
    { label: 'Funded escrow (safe)', value: totals.fundedEscrow },
    { label: 'Unfunded (at risk)', value: totals.unfunded },
    { label: 'Outstanding', value: totals.outstanding },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {figures.map((figure) => (
        <Card key={figure.label} size="sm">
          <CardContent className="grid gap-1">
            <span className="text-muted-foreground text-xs">{figure.label}</span>
            <Money value={figure.value} className="text-base font-semibold" />
          </CardContent>
        </Card>
      ))}
      <Card size="sm">
        <CardContent className="grid gap-1">
          <span className="text-muted-foreground text-xs">Collection rate</span>
          <span className="text-base font-semibold tabular-nums">
            {formatRatioAsPercent(totals.collectionRate)}
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
