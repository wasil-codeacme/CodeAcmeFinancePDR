import { Decimal, type DecimalString, ZERO, percentOf, sumDecimals } from '@/lib/decimal';

export type RevenueLineInput = {
  gross: DecimalString | null;
  feePercent: DecimalString;
  receipts: readonly { amount: DecimalString; isEscrow: boolean }[];
  adjustments: readonly { amount: DecimalString }[];
};

export type RevenueLineFigures = {
  gross: Decimal;
  fee: Decimal;
  net: Decimal;
  received: Decimal;
  fundedEscrow: Decimal;
  adjusted: Decimal;
  outstanding: Decimal;
  unfunded: Decimal;
};

/**
 * PRD §6: fee = gross × fee %, net = gross − fee, outstanding = net − received − written off,
 * unfunded (at risk) = outstanding − funded escrow. Escrow funding is not yet cash, so it
 * stays inside "outstanding" and only moves to "received" when released.
 */
export function computeRevenueLine(input: RevenueLineInput): RevenueLineFigures {
  const gross = input.gross === null ? ZERO : new Decimal(input.gross);
  const fee = percentOf(gross, input.feePercent);
  const net = gross.minus(fee);
  const received = sumDecimals(
    input.receipts
      .filter((receipt) => !receipt.isEscrow)
      .map((receipt) => new Decimal(receipt.amount)),
  );
  const fundedEscrow = sumDecimals(
    input.receipts
      .filter((receipt) => receipt.isEscrow)
      .map((receipt) => new Decimal(receipt.amount)),
  );
  const adjusted = sumDecimals(
    input.adjustments.map((adjustment) => new Decimal(adjustment.amount)),
  );
  const outstanding = net.minus(received).minus(adjusted);
  return {
    gross,
    fee,
    net,
    received,
    fundedEscrow,
    adjusted,
    outstanding,
    unfunded: outstanding.minus(fundedEscrow),
  };
}

export type ReceivableTotals = {
  netBooked: Decimal;
  received: Decimal;
  fundedEscrow: Decimal;
  unfunded: Decimal;
  outstanding: Decimal;
  writtenOff: Decimal;
  collectionRate: Decimal | null;
};

/** The workbook's "Receivables breakdown": totals plus collection rate = received ÷ net booked. */
export function summarizeReceivables(lines: readonly RevenueLineFigures[]): ReceivableTotals {
  const netBooked = sumDecimals(lines.map((line) => line.net));
  const received = sumDecimals(lines.map((line) => line.received));
  return {
    netBooked,
    received,
    fundedEscrow: sumDecimals(lines.map((line) => line.fundedEscrow)),
    unfunded: sumDecimals(lines.map((line) => line.unfunded)),
    outstanding: sumDecimals(lines.map((line) => line.outstanding)),
    writtenOff: sumDecimals(lines.map((line) => line.adjusted)),
    collectionRate: netBooked.isZero() ? null : received.dividedBy(netBooked),
  };
}
