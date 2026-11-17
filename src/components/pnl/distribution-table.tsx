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
    <div className="bg-card overflow-hidden rounded-xl border shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Partner</TableHead>
            <TableHead className="hidden text-right md:table-cell">Split</TableHead>
            <TableHead className="hidden text-right lg:table-cell">Baseline share</TableHead>
            <TableHead className="hidden text-right sm:table-cell">(−) Reserve</TableHead>
            <TableHead className="text-right">Take-home ({currencies.reporting})</TableHead>
            <TableHead className="hidden text-right sm:table-cell">
              Take-home ({currencies.display})
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {distribution.partners.map((partner) => (
            <TableRow key={partner.partnerId}>
              <TableCell className="font-medium">{partner.partnerName}</TableCell>
              <TableCell className="hidden text-right md:table-cell">
                {formatPercentValue(partner.splitPercent)}
              </TableCell>
              <TableCell className="hidden text-right lg:table-cell">
                <Money value={partner.baselineShare} />
              </TableCell>
              <TableCell className="hidden text-right sm:table-cell">
                <Money value={partner.reserve} />
              </TableCell>
              <TableCell className="text-right font-semibold">
                <Money value={partner.takeHome} emphasizeNegative />
                <Money
                  value={partner.takeHomeDisplay}
                  currency={currencies.display}
                  className="text-muted-foreground block text-xs font-normal sm:hidden"
                />
              </TableCell>
              <TableCell className="hidden text-right sm:table-cell">
                <Money value={partner.takeHomeDisplay} currency={currencies.display} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>
              Distributable profit
              <Money
                value={distribution.distributableProfit}
                emphasizeNegative
                className="block font-medium lg:hidden"
              />
            </TableCell>
            <TableCell className="hidden md:table-cell" />
            <TableCell className="hidden text-right lg:table-cell">
              <Money value={distribution.distributableProfit} emphasizeNegative />
            </TableCell>
            <TableCell className="hidden text-right sm:table-cell">
              <Money value={distribution.totalReserves} />
            </TableCell>
            <TableCell className="text-muted-foreground text-right text-xs sm:hidden">
              Reserves stay in the company
            </TableCell>
            <TableCell
              colSpan={2}
              className="text-muted-foreground hidden text-right text-xs sm:table-cell"
            >
              Reserves stay in the company
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
