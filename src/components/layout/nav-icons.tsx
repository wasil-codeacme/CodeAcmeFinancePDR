import {
  ArrowDownToLine,
  ChartColumn,
  Coins,
  Contact,
  Landmark,
  Lock,
  Target,
  UsersRound,
  Building2,
  LayoutDashboard,
  type LucideIcon,
  Receipt,
  Repeat,
  Settings,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { NAV_ICON, type NavIcon } from '@/lib/navigation';

export const NAV_ICONS: Record<NavIcon, LucideIcon> = {
  [NAV_ICON.DASHBOARD]: LayoutDashboard,
  [NAV_ICON.REVENUE]: TrendingUp,
  [NAV_ICON.RECEIVABLES]: ArrowDownToLine,
  [NAV_ICON.EXPENSES]: Wallet,
  [NAV_ICON.RECURRING]: Repeat,
  [NAV_ICON.PNL]: Receipt,
  [NAV_ICON.CLIENTS]: Building2,
  [NAV_ICON.SETTINGS]: Settings,
  [NAV_ICON.ACCOUNTS]: Landmark,
  [NAV_ICON.PARTNERS]: UsersRound,
  [NAV_ICON.CLOSE]: Lock,
  [NAV_ICON.TEAM]: Contact,
  [NAV_ICON.RATES]: Coins,
  [NAV_ICON.REPORTS]: ChartColumn,
  [NAV_ICON.SALES_CAC]: Target,
};
