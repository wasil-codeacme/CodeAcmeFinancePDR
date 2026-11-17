import { Decimal } from '@/lib/decimal';
import { type MonthKey, formatMonthLabel } from '@/lib/month';
import { toReportingCurrency } from '@/server/domain/currency';
import { pickEffectiveVersion } from '@/server/domain/effective-version';
import type { ChannelActivity, ChannelSpend } from '@/server/domain/sales-cac';
import { MissingExchangeRateError, NotFoundError } from '@/server/errors';
import { companyRepository } from '@/server/repositories/company.repository';
import { expenseRepository } from '@/server/repositories/expense.repository';
import { salesActivityRepository } from '@/server/repositories/sales-activity.repository';
import { exchangeRateRepository } from '@/server/repositories/settings.repository';

export type SalesCacMonth = { spend: ChannelSpend[]; activity: ChannelActivity[] };

export type SalesCacData = { byMonth: Map<MonthKey, SalesCacMonth>; warnings: string[] };

/** Sales spend (reporting currency, at each month's rate) and channel activity, by month. */
export async function loadSalesCac(months: readonly MonthKey[]): Promise<SalesCacData> {
  const [company, spend, activity, rates] = await Promise.all([
    companyRepository.find(),
    expenseRepository.salesSpendForMonths(months),
    salesActivityRepository.listForMonths(months),
    exchangeRateRepository.list(),
  ]);
  if (!company) throw new NotFoundError();
  const currencies = { reporting: company.reportingCurrency, display: company.displayCurrency };
  const rateVersions = rates.map((rate) => ({ ...rate, effectiveFrom: rate.month }));
  const missing = new Set<MonthKey>();
  const byMonth = new Map<MonthKey, SalesCacMonth>(
    months.map((month) => [month, { spend: [], activity: [] }]),
  );
  for (const line of spend) {
    const rate = pickEffectiveVersion(rateVersions, line.month)?.rate ?? null;
    try {
      const amount = toReportingCurrency(line.amount, line.currency, rate, currencies);
      byMonth
        .get(line.month)
        ?.spend.push({ channel: line.salesChannel, amount: new Decimal(amount) });
    } catch (error) {
      if (!(error instanceof MissingExchangeRateError)) throw error;
      missing.add(line.month);
    }
  }
  for (const entry of activity) byMonth.get(entry.month)?.activity.push(entry);
  const warnings =
    missing.size === 0
      ? []
      : [
          `Some sales spend in ${[...missing].sort().map(formatMonthLabel).join(', ')} has no exchange rate and is left out.`,
        ];
  return { byMonth, warnings };
}
