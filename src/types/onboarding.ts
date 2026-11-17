export type OnboardingStatus = {
  company: boolean;
  partners: boolean;
  reserveRule: boolean;
  accounts: boolean;
  platforms: boolean;
  categories: boolean;
  exchangeRate: boolean;
  completedAt: Date | null;
};
