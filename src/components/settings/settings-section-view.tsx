import { AccountsSection } from '@/components/settings/accounts-section';
import { CategoriesSection } from '@/components/settings/categories-section';
import { CommissionForm } from '@/components/settings/commission-form';
import { CompanyForm } from '@/components/settings/company-form';
import { PartnersList } from '@/components/settings/partners-section';
import { PlatformsSection } from '@/components/settings/platforms-section';
import { RatesSection } from '@/components/settings/rates-section';
import { ReserveRuleForm } from '@/components/settings/reserve-rule-form';
import { SplitForm } from '@/components/settings/split-form';
import { TeamSection } from '@/components/settings/team-section';
import { UsersSection } from '@/components/settings/users-section';
import { WorkbookImport } from '@/components/settings/workbook-import';
import { SectionCard } from '@/components/shared/section-card';
import type { MonthKey } from '@/lib/month';
import { SETTINGS_SECTION, type SettingsSection } from '@/lib/settings-sections';
import { pickEffectiveVersion } from '@/server/domain/effective-version';
import { getCompany } from '@/server/services/company.service';
import { listPlatforms } from '@/server/services/platform.service';
import { getProfitSharingSettings } from '@/server/services/profit-sharing.service';
import {
  listAccounts,
  listCommissionRules,
  listExchangeRates,
  listExpenseCategories,
  listTeamMembers,
} from '@/server/services/settings.service';
import { listUsers } from '@/server/services/user.service';

type SettingsSectionViewProps = {
  section: SettingsSection;
  currentUserId: string;
  currentMonth: MonthKey;
};

/** Loads and renders one Settings section; used by Settings and by the onboarding steps. */
export async function SettingsSectionView({
  section,
  currentUserId,
  currentMonth,
}: SettingsSectionViewProps) {
  switch (section) {
    case SETTINGS_SECTION.COMPANY: {
      const company = await getCompany();
      return (
        <SectionCard title="Company" description="Name and the currencies the books are kept in.">
          <CompanyForm company={company} />
        </SectionCard>
      );
    }
    case SETTINGS_SECTION.PARTNERS: {
      const { partners, splitVersions, reserveRules } = await getProfitSharingSettings();
      return (
        <div className="grid gap-4 lg:grid-cols-2">
          <PartnersList
            partners={partners}
            currentSplit={pickEffectiveVersion(splitVersions, currentMonth)}
          />
          <SplitForm partners={partners} versions={splitVersions} defaultMonth={currentMonth} />
          <ReserveRuleForm rules={reserveRules} defaultMonth={currentMonth} />
        </div>
      );
    }
    case SETTINGS_SECTION.COMMISSION: {
      const [rules, members, categories] = await Promise.all([
        listCommissionRules(),
        listTeamMembers(),
        listExpenseCategories(),
      ]);
      const earners = members
        .filter((member) => member.earnsCommission && member.active)
        .map((member) => member.name);
      return (
        <CommissionForm
          rules={rules}
          earners={earners}
          categories={categories
            .filter((category) => category.active)
            .map((category) => ({ value: category.id, label: category.name }))}
          defaultMonth={currentMonth}
        />
      );
    }
    case SETTINGS_SECTION.ACCOUNTS: {
      const [accounts, company] = await Promise.all([listAccounts(), getCompany()]);
      return (
        <AccountsSection
          accounts={accounts}
          defaultMonth={currentMonth}
          reportingCurrency={company?.reportingCurrency ?? ''}
        />
      );
    }
    case SETTINGS_SECTION.PLATFORMS:
      return <PlatformsSection platforms={await listPlatforms()} defaultMonth={currentMonth} />;
    case SETTINGS_SECTION.CATEGORIES:
      return <CategoriesSection categories={await listExpenseCategories()} />;
    case SETTINGS_SECTION.TEAM: {
      const [members, categories] = await Promise.all([listTeamMembers(), listExpenseCategories()]);
      return <TeamSection members={members} categories={categories} />;
    }
    case SETTINGS_SECTION.RATES: {
      const [rates, company] = await Promise.all([listExchangeRates(), getCompany()]);
      const currencies = company
        ? { reporting: company.reportingCurrency, display: company.displayCurrency }
        : null;
      return <RatesSection rates={rates} defaultMonth={currentMonth} currencies={currencies} />;
    }
    case SETTINGS_SECTION.USERS: {
      const users = await listUsers();
      return <UsersSection users={users} currentUserId={currentUserId} />;
    }
    case SETTINGS_SECTION.IMPORT: {
      const accounts = await listAccounts();
      const options = accounts
        .filter((account) => account.active)
        .map((account) => ({ value: account.id, label: account.name }));
      return <WorkbookImport accounts={options} />;
    }
  }
}
