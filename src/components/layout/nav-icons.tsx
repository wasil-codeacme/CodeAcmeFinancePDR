import {
  ArrowDownToLine,
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
};
