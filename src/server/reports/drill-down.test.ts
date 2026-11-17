import { describe, expect, it } from 'vitest';

import {
  AdjustmentKind,
  EntryStatus,
  FundingSource,
  InvoiceStatus,
  PnlLine,
  ProjectStatus,
  RevenueKind,
} from '@/generated/prisma/enums';
import { Decimal } from '@/lib/decimal';
import {
  adjustmentsDrill,
  expensesDrill,
  receivablesDrill,
  revenueDrill,
} from '@/server/reports/drill-down';
import type { ExpenseRecord } from '@/types/expense';
import type { RevenueEntryRecord } from '@/types/revenue';

function entry(overrides: Partial<RevenueEntryRecord>): RevenueEntryRecord {
  return {
    id: 'entry',
    kind: RevenueKind.BOOKED,
    status: EntryStatus.CONFIRMED,
    clientId: 'client',
    clientName: 'Client X',
    projectId: null,
    projectName: null,
    platformId: null,
    platformName: 'Upwork',
    bookingMonth: '2026-01',
    description: null,
    gross: '1000',
    feePercent: '10',
    projectStatus: ProjectStatus.IN_PROGRESS,
    invoiceStatus: InvoiceStatus.PROCESSED,
    referredBy: null,
    closedByTeamMemberId: null,
    closedByName: null,
    expectedDate: null,
    notes: null,
    receipts: [],
    adjustments: [],
    ...overrides,
  };
}

function expense(overrides: Partial<ExpenseRecord>): ExpenseRecord {
  return {
    id: 'expense',
    status: EntryStatus.CONFIRMED,
    expenseDate: '2026-01-05',
    paidOn: null,
    month: '2026-01',
    categoryId: 'ops',
    categoryName: 'Operations Overhead',
    item: 'Slack',
    payeeTeamMemberId: null,
    payeeName: null,
    amount: '2800',
    currency: 'PKR',
    fundingSource: FundingSource.COMPANY,
    fundingPartnerId: null,
    fundingPartnerName: null,
    paidFromAccountId: null,
    paidFromAccountName: null,
    recurringTemplateId: null,
    salesChannel: null,
    notes: null,
    ...overrides,
  };
}

describe('drill-down (PRD §5.7: click any number to see the entries behind it)', () => {
  const entries = [
    entry({ id: 'jan' }),
    entry({
      id: 'feb',
      bookingMonth: '2026-02',
      gross: '500',
      receipts: [
        {
          id: 'r',
          receivedOn: '2026-02-20',
          amount: '450',
          accountId: null,
          accountName: null,
          isEscrow: false,
        },
      ],
    }),
    entry({ id: 'standalone', kind: RevenueKind.STANDALONE, gross: null }),
  ];

  it('lists booked revenue in the period, totalling gross, fee and net', () => {
    const table = revenueDrill(entries, ['2026-01', '2026-02']);
    expect(table.rows.map((row) => row.id)).toEqual(['jan', 'feb']);
    expect(table.totals.slice(-3)).toEqual(['1500', '150', '1350']);
    expect(table.rows[0]?.href).toBe('/revenue?month=2026-01');
  });

  it('totals receivables to what the receivables report shows', () => {
    const table = receivablesDrill(entries, ['2026-02']);
    expect(table.totals.at(-1)).toBe('0');
    expect(receivablesDrill(entries, ['2026-01']).totals.at(-1)).toBe('900');
  });

  it('lists write-offs by the month they post to, not the month booked', () => {
    const written = entry({
      adjustments: [
        {
          id: 'adj',
          adjustedOn: '2026-03-02',
          postingMonth: '2026-03',
          amount: '100',
          kind: AdjustmentKind.WRITE_OFF,
          reason: 'Client left',
        },
      ],
    });
    expect(adjustmentsDrill([written], ['2026-01']).rows).toHaveLength(0);
    expect(adjustmentsDrill([written], ['2026-03']).totals.at(-1)).toBe('100');
  });

  it('filters expenses by P&L line and funding, converting each at its rate', () => {
    const table = expensesDrill(
      [
        expense({ id: 'company' }),
        expense({ id: 'external', fundingSource: FundingSource.EXTERNAL }),
        expense({ id: 'sales', categoryId: 'sales' }),
      ],
      (categoryId) => (categoryId === 'ops' ? PnlLine.OPERATIONS_OVERHEAD : PnlLine.SALES_OVERHEAD),
      { line: PnlLine.OPERATIONS_OVERHEAD, funding: FundingSource.COMPANY },
      (line) => new Decimal(line.amount).dividedBy(280),
    );
    expect(table.rows.map((row) => row.id)).toEqual(['company']);
    expect(table.totals.at(-1)).toBe('10');
    expect(table.title).toBe('Operations Overhead, company funded');
  });
});
