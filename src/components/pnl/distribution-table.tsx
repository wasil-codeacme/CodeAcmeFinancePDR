import { Money } from '@/components/shared/money';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatPercentValue } from '@/lib/format';
import type { Distribution } from '@/server/domain/distribution';

type DistributionTableProps = {
  distribution: Distribution;
  currencies: { reporting: string; display: string };
};

/** Founders only: each partner's baseline share, reserve and take-home (PRD §6). */
export function DistributionTable({ distribution, currencies }: DistributionTableProps) {
  return (
    <div className="bg-card overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Partner</TableHead>
            <TableHead className="text-right">Split</TableHead>
            <TableHead className="text-right">Baseline share</TableHead>
            <TableHead className="text-right">(−) Reserve</TableHead>
            <TableHead className="text-right">Take-home ({currencies.reporting})</TableHead>
            <TableHead className="text-right">Take-home ({currencies.display})</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {distribution.partners.map((partner) => (
            <TableRow key={partner.partnerId}>
              <TableCell className="font-medium">{partner.partnerName}</TableCell>
              <TableCell className="text-right">
                {formatPercentValue(partner.splitPercent)}
              </TableCell>
              <TableCell className="text-right">
                <Money value={partner.baselineShare} />
              </TableCell>
              <TableCell className="text-right">
                <Money value={partner.reserve} />
              </TableCell>
              <TableCell className="text-right font-semibold">
                <Money value={partner.takeHome} emphasizeNegative />
              </TableCell>
              <TableCell className="text-right">
                <Money value={partner.takeHomeDisplay} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>Distributable profit</TableCell>
            <TableCell className="text-right">
              <Money value={distribution.distributableProfit} emphasizeNegative />
            </TableCell>
            <TableCell className="text-right">
              <Money value={distribution.totalReserves} />
            </TableCell>
            <TableCell colSpan={2} className="text-muted-foreground text-right text-xs">
              Reserves stay in the company
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
