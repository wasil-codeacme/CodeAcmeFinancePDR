import { Decimal, type DecimalString } from '@/lib/decimal';
import { type MonthKey, addMonths, compareMonthKeys } from '@/lib/month';

/** One month's cash movements through an account, already in the account's currency. */
export type AccountMovements = {
  receiptsIn: DecimalString;
  fundingIn: DecimalString;
  transfersIn: DecimalString;
  expensesOut: DecimalString;
  transfersOut: DecimalString;
  withdrawalsOut: DecimalString;
};

export type AccountMonth = {
  month: MonthKey;
  opening: Decimal;
  inflow: Decimal;
  outflow: Decimal;
  expectedClosing: Decimal;
  enteredClosing: Decimal | null;
  /** The entered figure when there is one, otherwise the expected figure carried forward. */
  closing: Decimal;
  difference: Decimal | null;
};

type TimelineInput = {
  openingBalance: DecimalString;
  openingMonth: MonthKey;
  throughMonth: MonthKey;
  movements: Partial<Record<MonthKey, AccountMovements>>;
  enteredClosings: Partial<Record<MonthKey, DecimalString>>;
};

function inflowOf(movements: AccountMovements | undefined): Decimal {
  if (!movements) return new Decimal(0);
  return new Decimal(movements.receiptsIn).plus(movements.fundingIn).plus(movements.transfersIn);
}

function outflowOf(movements: AccountMovements | undefined): Decimal {
  if (!movements) return new Decimal(0);
  return new Decimal(movements.expensesOut)
    .plus(movements.transfersOut)
    .plus(movements.withdrawalsOut);
}

/**
 * PRD §5.4: the opening balance is never typed — it is the previous month's closing. The
 * expected closing (opening + money in − money out) sits beside the figure the user enters,
 * with the difference; an unentered month carries its expected closing forward.
 */
export function computeAccountTimeline(input: TimelineInput): AccountMonth[] {
  const months: AccountMonth[] = [];
  let opening = new Decimal(input.openingBalance);
  for (
    let month = input.openingMonth;
    compareMonthKeys(month, input.throughMonth) <= 0;
    month = addMonths(month, 1)
  ) {
    const movements = input.movements[month];
    const inflow = inflowOf(movements);
    const outflow = outflowOf(movements);
    const expectedClosing = opening.plus(inflow).minus(outflow);
    const entered = input.enteredClosings[month];
    const enteredClosing = entered === undefined ? null : new Decimal(entered);
    months.push({
      month,
      opening,
      inflow,
      outflow,
      expectedClosing,
      enteredClosing,
      closing: enteredClosing ?? expectedClosing,
      difference: enteredClosing ? enteredClosing.minus(expectedClosing) : null,
    });
    opening = enteredClosing ?? expectedClosing;
  }
  return months;
}
