import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { ChartCard, PeriodBars } from '@/components/reports/charts/chart-primitives';
import { Money } from '@/components/shared/money';
import { PageHeader } from '@/components/shared/page-header';
import { CardListSkeleton, StatCardsSkeleton } from '@/components/shared/skeletons';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SEARCH_PARAM } from '@/lib/constants';
import { formatCurrency, formatRatioAsPercent } from '@/lib/format';
import { PERMISSION } from '@/lib/permissions';
import { ROUTES, withSearchParams } from '@/lib/routes';
import { requireBooksUser } from '@/server/auth/current-user';
import { getDashboard } from '@/server/services/dashboard.service';
import type { PeriodGlance } from '@/types/dashboard';

export const metadata: Metadata = { title: 'Dashboard' };

const PROFIT_SERIES = [
  { key: 'revenue', label: 'Net revenue' },
  { key: 'expenses', label: 'Company expense' },
  { key: 'profit', label: 'Net profit' },
];

const QUICK_LINKS = [
  { label: 'Book revenue', href: ROUTES.REVENUE },
  { label: 'Add an expense', href: ROUTES.EXPENSES },
  { label: 'Chase receivables', href: ROUTES.RECEIVABLES },
  { label: 'Reports', href: ROUTES.REPORTS.PNL },
] as const;

function Stat({
  label,
  value,
  note,
  href,
}: {
  label: string;
  value: string | null;
  note: string;
  href: string;
}) {
  return (
    <Link href={href} prefetch className="group">
      <Card className="ca-glow group-hover:border-foreground/20 h-full transition-colors">
        <CardHeader>
          <CardDescription>{label}</CardDescription>
          <CardTitle className="font-figures text-2xl">
            {value === null ? '—' : <Money value={value} emphasizeNegative />}
          </CardTitle>
          <p className="text-muted-foreground text-xs">{note}</p>
        </CardHeader>
      </Card>
    </Link>
  );
}

function GlanceRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <span className={strong ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
      <Money
        value={value}
        emphasizeNegative={strong}
        className={strong ? 'text-base font-semibold' : ''}
      />
    </div>
  );
}

/** This month or this quarter at a glance, linking to the full statement for it. */
function Glance({ title, glance }: { title: string; glance: PeriodGlance }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{glance.label}</CardDescription>
        <CardAction>
          <Button asChild size="sm" variant="ghost">
            <Link
              href={withSearchParams(ROUTES.REPORTS.PNL, {
                [SEARCH_PARAM.PERIOD]: glance.periodParam,
              })}
            >
              P&amp;L <ArrowRight />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="divide-y">
        <GlanceRow label="Net revenue" value={glance.netRevenue} />
        <GlanceRow label="Company expense" value={glance.companyExpense} />
        <GlanceRow label="Net profit (company)" value={glance.netProfit} strong />
        <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
          <span className="text-muted-foreground">Margin</span>
          <span className="tabular-nums">{formatRatioAsPercent(glance.margin)}</span>
        </div>
        {glance.missingMonths > 0 ? (
          <p className="text-muted-foreground pt-2 text-xs">
            {glance.missingMonths} month(s) left out: no exchange rate yet.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

async function DashboardContent() {
  const [user] = await Promise.all([requireBooksUser(PERMISSION.REPORTS_VIEW), connection()]);
  const view = await getDashboard(user, new Date());
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Stat
          label="Cash in hand"
          value={view.cashInHand}
          note="All accounts: typed balances where entered, expected otherwise."
          href={ROUTES.ACCOUNTS}
        />
        <Stat
          label="Outstanding receivables"
          value={view.outstanding}
          note={`Unfunded (at risk) ${formatCurrency(view.unfunded, view.currency)} · collection rate ${formatRatioAsPercent(view.collectionRate)}`}
          href={ROUTES.RECEIVABLES}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Glance title="This month" glance={view.month} />
        <Glance title="This quarter" glance={view.quarter} />
      </div>
      <ChartCard
        title={`${view.year.label} by quarter`}
        description="Net revenue, company expense and net profit."
        tableHref={withSearchParams(ROUTES.REPORTS.PNL, {
          [SEARCH_PARAM.PERIOD]: view.year.periodParam,
        })}
      >
        <PeriodBars data={view.year.chart} series={PROFIT_SERIES} currency={view.currency} />
      </ChartCard>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_LINKS.map((link) => (
          <Button key={link.href} asChild variant="outline" className="justify-between">
            <Link href={link.href} prefetch>
              {link.label}
              <ArrowRight />
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="This month and this quarter at a glance, with cash in hand and what clients still owe."
      />
      <Suspense
        fallback={
          <div className="grid gap-6">
            <StatCardsSkeleton count={2} />
            <CardListSkeleton count={2} />
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </>
  );
}
