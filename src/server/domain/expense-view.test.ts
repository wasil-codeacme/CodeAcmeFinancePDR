import { describe, expect, it } from 'vitest';

import { EntryStatus, FundingSource, PnlLine } from '@/generated/prisma/enums';
import { groupExpenseMonth } from '@/server/domain/expense-view';
import type { ExpenseRow } from '@/types/expense';

function row(overrides: Partial<ExpenseRow>): ExpenseRow {
  return {
    id: 'row',
    status: EntryStatus.CONFIRMED,
    expenseDate: '2026-03-01',
    paidOn: null,
    month: '2026-03',
    categoryId: 'ops',
    categoryName: 'Operations Overhead',
    item: 'Slack',
    payeeTeamMemberId: null,
    payeeName: null,
    amount: '2780',
    currency: 'PKR',
    fundingSource: FundingSource.COMPANY,
    fundingPartnerId: null,
    fundingPartnerName: null,
    paidFromAccountId: null,
    paidFromAccountName: null,
    recurringTemplateId: null,
    salesChannel: null,
    notes: null,
    attachments: [],
    reportingAmount: '10',
    displayAmount: '2780',
    ...overrides,
  };
}

const CATEGORIES = [
  { id: 'ops', name: 'Operations Overhead', pnlLine: PnlLine.OPERATIONS_OVERHEAD, active: true },
  { id: 'sales', name: 'Sales Overheads', pnlLine: PnlLine.SALES_OVERHEAD, active: true },
  { id: 'old', name: 'Old category', pnlLine: PnlLine.MANAGEMENT, active: false },
];

describe('groupExpenseMonth (the expenses page, PRD §5.3)', () => {
  const lists = groupExpenseMonth(
    [
      row({ id: 'a' }),
      row({
        id: 'b',
        fundingSource: FundingSource.EXTERNAL,
        reportingAmount: '5',
        displayAmount: '1390',
      }),
      row({ id: 'c', categoryId: 'sales', reportingAmount: '20', displayAmount: '5560' }),
      row({ id: 'd', status: EntryStatus.DRAFT, reportingAmount: '99' }),
    ],
    CATEGORIES,
  );

  it('groups confirmed lines by category in category order, with subtotals by funding source', () => {
    expect(lists.groups.map((group) => group.categoryId)).toEqual(['ops', 'sales']);
    expect(lists.groups[0]).toMatchObject({
      companyTotal: '10',
      externalTotal: '5',
      displayTotal: '4170',
    });
  });

  it('keeps drafts apart and out of every total', () => {
    expect(lists.drafts.map((draft) => draft.id)).toEqual(['d']);
    expect(lists.companyTotal).toBe('30');
    expect(lists.externalTotal).toBe('5');
  });

  it('hides an inactive category with nothing in it, and shows an active one even when empty', () => {
    const empty = groupExpenseMonth([], CATEGORIES);
    expect(empty.groups.map((group) => group.categoryId)).toEqual(['ops', 'sales']);
  });

  it('leaves the display-currency subtotal blank when a line has no rate', () => {
    const noRate = groupExpenseMonth([row({ id: 'x', displayAmount: null })], CATEGORIES);
    expect(noRate.groups[0]?.displayTotal).toBeNull();
  });
});
