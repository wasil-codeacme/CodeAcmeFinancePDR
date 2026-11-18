import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { type MonthKey, isoDateToDate } from '@/lib/month';
import type { ReportPeriod } from '@/lib/report-period';
import type { ReportKind } from '@/lib/reports';
import { BOOKS_CACHE_LIFE, CACHE_TAG, DATA_VERSION_CACHE_LIFE } from '@/server/cache-tags';
import type { RevenueFilters } from '@/server/repositories/revenue.repository';
import { getAccountHistory, getAccountsMonth } from '@/server/services/account-balance.service';
import { getCharts } from '@/server/services/chart.service';
import { getClientHistory } from '@/server/services/client.service';
import { getDashboard } from '@/server/services/dashboard.service';
import { getDrillDown } from '@/server/services/drill-down.service';
import { getExpenseMonth } from '@/server/services/expense.service';
import { getPartnerLedgers } from '@/server/services/partner-ledger.service';
import { getReceivables } from '@/server/services/receivable.service';
import { getReport } from '@/server/services/report.service';
import { getRevenueMonth } from '@/server/services/revenue.service';
import { getSalesActivity } from '@/server/services/sales-activity.service';
import type { DrillQuery } from '@/server/validators/report.schema';
import type { SessionUser } from '@/types/auth';

/*
 * The book views pages read, kept in the shared remote cache (one copy for all server
 * instances) until a write expires CACHE_TAG.BOOKS. Callers check the session and the page
 * permission first; the user is part of the key for views that vary by role, so a cached
 * view never crosses users. Views that depend on the clock take today's ISO date (UTC),
 * which is all they read from it, so one entry serves the whole day.
 *
 * The monthly P&L and the month close are not here: they return exact Decimal objects,
 * which the cache cannot store, so they stay live.
 */

function booksCache(): void {
  cacheTag(CACHE_TAG.BOOKS);
  cacheLife(BOOKS_CACHE_LIFE);
}

/** Changes whenever the books do; open tabs compare it to know when to refresh. */
export async function getDataVersion(): Promise<string> {
  'use cache: remote';
  cacheTag(CACHE_TAG.BOOKS);
  cacheLife(DATA_VERSION_CACHE_LIFE);
  return String(Date.now());
}

export async function cachedRevenueMonth(month: MonthKey, filters: RevenueFilters) {
  'use cache: remote';
  booksCache();
  return getRevenueMonth(month, filters);
}

export async function cachedExpenseMonth(month: MonthKey) {
  'use cache: remote';
  booksCache();
  return getExpenseMonth(month);
}

export async function cachedReceivables(today: string) {
  'use cache: remote';
  booksCache();
  return getReceivables(isoDateToDate(today));
}

export async function cachedAccountsMonth(month: MonthKey) {
  'use cache: remote';
  booksCache();
  return getAccountsMonth(month);
}

export async function cachedAccountHistory(accountId: string, throughMonth: MonthKey) {
  'use cache: remote';
  booksCache();
  return getAccountHistory(accountId, throughMonth);
}

export async function cachedPartnerLedgers() {
  'use cache: remote';
  booksCache();
  return getPartnerLedgers();
}

export async function cachedSalesActivity(month: MonthKey) {
  'use cache: remote';
  booksCache();
  return getSalesActivity(month);
}

export async function cachedClientHistory(clientId: string) {
  'use cache: remote';
  booksCache();
  return getClientHistory(clientId);
}

export async function cachedDashboard(user: SessionUser, today: string) {
  'use cache: remote';
  booksCache();
  return getDashboard(user, isoDateToDate(today));
}

export async function cachedReport(
  user: SessionUser,
  kind: ReportKind,
  period: ReportPeriod,
  today: string,
) {
  'use cache: remote';
  booksCache();
  return getReport(user, kind, period, isoDateToDate(today));
}

export async function cachedCharts(user: SessionUser, period: ReportPeriod, today: string) {
  'use cache: remote';
  booksCache();
  return getCharts(user, period, isoDateToDate(today));
}

export async function cachedDrillDown(
  user: SessionUser,
  period: ReportPeriod,
  query: DrillQuery,
  today: string,
) {
  'use cache: remote';
  booksCache();
  return getDrillDown(user, period, query, isoDateToDate(today));
}
