import { db } from '@/server/repositories/db';

const COMPANY_SINGLETON = 'COMPANY';

export type CompanyRecord = {
  id: string;
  name: string;
  reportingCurrency: string;
  displayCurrency: string;
  onboardingCompletedAt: Date | null;
};

const COMPANY_SELECT = {
  id: true,
  name: true,
  reportingCurrency: true,
  displayCurrency: true,
  onboardingCompletedAt: true,
} as const;

export const companyRepository = {
  find(): Promise<CompanyRecord | null> {
    return db().companySettings.findUnique({
      where: { singleton: COMPANY_SINGLETON },
      select: COMPANY_SELECT,
    });
  },

  upsert(data: {
    name: string;
    reportingCurrency: string;
    displayCurrency: string;
  }): Promise<CompanyRecord> {
    return db().companySettings.upsert({
      where: { singleton: COMPANY_SINGLETON },
      create: { ...data, singleton: COMPANY_SINGLETON },
      update: data,
      select: COMPANY_SELECT,
    });
  },

  markOnboardingComplete(completedAt: Date): Promise<CompanyRecord> {
    return db().companySettings.update({
      where: { singleton: COMPANY_SINGLETON },
      data: { onboardingCompletedAt: completedAt },
      select: COMPANY_SELECT,
    });
  },

  async hasAnyEntries(): Promise<boolean> {
    const [revenueCount, expenseCount] = await Promise.all([
      db().revenueEntry.count(),
      db().expense.count(),
    ]);
    return revenueCount + expenseCount > 0;
  },
};
