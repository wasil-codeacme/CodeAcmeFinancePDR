import type {
  AccountType,
  CommissionBase,
  PnlLine,
  TeamMemberType,
} from '@/generated/prisma/enums';
import type { DecimalString } from '@/lib/decimal';
import type { MonthKey } from '@/lib/month';
import { db } from '@/server/repositories/db';
import { dateToMonthKey, decimalToString, monthKeyToDbDate } from '@/server/repositories/mappers';

export type CommissionRuleRecord = {
  id: string;
  effectiveFrom: MonthKey;
  ratePercent: DecimalString;
  base: CommissionBase;
};

export type AccountRecord = {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  ownerLabel: string | null;
  openingBalance: DecimalString;
  openingBalanceMonth: MonthKey;
  active: boolean;
};

export type AccountData = Omit<AccountRecord, 'id'>;

export type ExpenseCategoryRecord = {
  id: string;
  name: string;
  sortOrder: number;
  pnlLine: PnlLine;
  active: boolean;
};

export type ExpenseCategoryData = Omit<ExpenseCategoryRecord, 'id'>;

export type TeamMemberRecord = {
  id: string;
  name: string;
  type: TeamMemberType;
  defaultCategoryId: string | null;
  earnsCommission: boolean;
  active: boolean;
};

export type TeamMemberData = Omit<TeamMemberRecord, 'id'>;

export type ExchangeRateRecord = { id: string; month: MonthKey; rate: DecimalString };

export const commissionRuleRepository = {
  async list(): Promise<CommissionRuleRecord[]> {
    const rows = await db().commissionRuleVersion.findMany({ orderBy: { effectiveFrom: 'desc' } });
    return rows.map((row) => ({
      id: row.id,
      effectiveFrom: dateToMonthKey(row.effectiveFrom),
      ratePercent: decimalToString(row.ratePercent),
      base: row.base,
    }));
  },

  async upsert(
    effectiveFrom: MonthKey,
    data: { ratePercent: DecimalString; base: CommissionBase },
  ): Promise<{ id: string }> {
    const effectiveDate = monthKeyToDbDate(effectiveFrom);
    return db().commissionRuleVersion.upsert({
      where: { effectiveFrom: effectiveDate },
      create: { effectiveFrom: effectiveDate, ...data },
      update: data,
      select: { id: true },
    });
  },
};

function toAccount(row: {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  ownerLabel: string | null;
  openingBalance: { toString(): string };
  openingBalanceMonth: Date;
  active: boolean;
}): AccountRecord {
  return {
    ...row,
    openingBalance: row.openingBalance.toString(),
    openingBalanceMonth: dateToMonthKey(row.openingBalanceMonth),
  };
}

function toAccountRow(data: AccountData) {
  return { ...data, openingBalanceMonth: monthKeyToDbDate(data.openingBalanceMonth) };
}

export const accountRepository = {
  async list(): Promise<AccountRecord[]> {
    const rows = await db().account.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map(toAccount);
  },

  async findById(id: string): Promise<AccountRecord | null> {
    const row = await db().account.findUnique({ where: { id } });
    return row ? toAccount(row) : null;
  },

  async create(data: AccountData): Promise<AccountRecord> {
    return toAccount(await db().account.create({ data: toAccountRow(data) }));
  },

  async update(id: string, data: AccountData): Promise<AccountRecord> {
    return toAccount(await db().account.update({ where: { id }, data: toAccountRow(data) }));
  },
};

const CATEGORY_SELECT = {
  id: true,
  name: true,
  sortOrder: true,
  pnlLine: true,
  active: true,
} as const;

export const expenseCategoryRepository = {
  list(): Promise<ExpenseCategoryRecord[]> {
    return db().expenseCategory.findMany({
      select: CATEGORY_SELECT,
      orderBy: { sortOrder: 'asc' },
    });
  },

  findById(id: string): Promise<ExpenseCategoryRecord | null> {
    return db().expenseCategory.findUnique({ where: { id }, select: CATEGORY_SELECT });
  },

  async nextSortOrder(): Promise<number> {
    const last = await db().expenseCategory.findFirst({
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    return (last?.sortOrder ?? 0) + 1;
  },

  create(data: ExpenseCategoryData): Promise<ExpenseCategoryRecord> {
    return db().expenseCategory.create({ data, select: CATEGORY_SELECT });
  },

  update(id: string, data: Partial<ExpenseCategoryData>): Promise<ExpenseCategoryRecord> {
    return db().expenseCategory.update({ where: { id }, data, select: CATEGORY_SELECT });
  },
};

const TEAM_MEMBER_SELECT = {
  id: true,
  name: true,
  type: true,
  defaultCategoryId: true,
  earnsCommission: true,
  active: true,
} as const;

export const teamMemberRepository = {
  list(): Promise<TeamMemberRecord[]> {
    return db().teamMember.findMany({ select: TEAM_MEMBER_SELECT, orderBy: { name: 'asc' } });
  },

  findById(id: string): Promise<TeamMemberRecord | null> {
    return db().teamMember.findUnique({ where: { id }, select: TEAM_MEMBER_SELECT });
  },

  create(data: TeamMemberData): Promise<TeamMemberRecord> {
    return db().teamMember.create({ data, select: TEAM_MEMBER_SELECT });
  },

  update(id: string, data: TeamMemberData): Promise<TeamMemberRecord> {
    return db().teamMember.update({ where: { id }, data, select: TEAM_MEMBER_SELECT });
  },
};

function toExchangeRate(row: {
  id: string;
  month: Date;
  rate: { toString(): string };
}): ExchangeRateRecord {
  return { id: row.id, month: dateToMonthKey(row.month), rate: row.rate.toString() };
}

export const exchangeRateRepository = {
  async list(): Promise<ExchangeRateRecord[]> {
    const rows = await db().exchangeRate.findMany({ orderBy: { month: 'desc' } });
    return rows.map(toExchangeRate);
  },

  async findByMonth(month: MonthKey): Promise<ExchangeRateRecord | null> {
    const row = await db().exchangeRate.findUnique({ where: { month: monthKeyToDbDate(month) } });
    return row ? toExchangeRate(row) : null;
  },

  /** The month's own rate, or the latest earlier one carried forward. */
  async findEffective(month: MonthKey): Promise<ExchangeRateRecord | null> {
    const row = await db().exchangeRate.findFirst({
      where: { month: { lte: monthKeyToDbDate(month) } },
      orderBy: { month: 'desc' },
    });
    return row ? toExchangeRate(row) : null;
  },

  async upsert(month: MonthKey, rate: DecimalString): Promise<ExchangeRateRecord> {
    const monthDate = monthKeyToDbDate(month);
    const row = await db().exchangeRate.upsert({
      where: { month: monthDate },
      create: { month: monthDate, rate },
      update: { rate },
    });
    return toExchangeRate(row);
  },
};
