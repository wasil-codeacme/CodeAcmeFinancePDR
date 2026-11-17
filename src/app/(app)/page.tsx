import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { Money } from '@/components/shared/money';
import { PageHeader } from '@/components/shared/page-header';
import { StatCardsSkeleton } from '@/components/shared/skeletons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Decimal } from '@/lib/decimal';
import { formatRatioAsPercent } from '@/lib/format';
import { MESSAGES } from '@/lib/messages';
import { currentMonthKey, formatLongMonthLabel } from '@/lib/month';
import { PERMISSION } from '@/lib/permissions';
import { ROUTES } from '@/lib/routes';
import { requireBooksUser } from '@/server/auth/current-user';
import { PNL_RESULT, getMonthlyPnl } from '@/server/services/pnl.service';
import { getReceivables } from '@/server/services/receivable.service';

export const metadata: Metadata = { title: 'Dashboard' };

function Stat({ label, value, note }: { label: string; value: Decimal.Value; note?: string }) {
  return (
    <Card className="ca-glow">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="font-figures text-2xl">
          <Money value={value} emphasizeNegative />
        </CardTitle>
        {note ? <p className="text-muted-foreground text-xs">{note}</p> : null}
      </CardHeader>
    </Card>
  );
}

const QUICK_LINKS = [
  { label: 'Book revenue', href: ROUTES.REVENUE },
  { label: 'Add an expense', href: ROUTES.EXPENSES },
  { label: 'Chase receivables', href: ROUTES.RECEIVABLES },
  { label: 'Monthly P&L', href: ROUTES.PNL },
] as const;

async function DashboardContent() {
  await Promise.all([requireBooksUser(PERMISSION.REPORTS_VIEW), connection()]);
  const now = new Date();
  const month = currentMonthKey(now);
  const [pnlResult, receivables] = await Promise.all([
    getMonthlyPnl(month, { includeDistribution: false }),
    getReceivables(now),
  ]);
  return (
    <div className="grid gap-6">
      <p className="ca-eyebrow text-muted-foreground text-[0.7rem]">
        {formatLongMonthLabel(month)} so far
      </p>
      {pnlResult.kind === PNL_RESULT.READY ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Net revenue" value={pnlResult.pnl.netRevenue} />
          <Stat label="Company expense" value={pnlResult.pnl.totalCompanyExpense} />
          <Stat
            label="Net profit (company)"
            value={pnlResult.pnl.netProfitCompany}
            note={`Margin ${formatRatioAsPercent(pnlResult.pnl.marginCompany)}`}
          />
          <Stat
            label="Outstanding receivables"
            value={receivables.totals.outstanding}
            note={`Collection rate ${formatRatioAsPercent(receivables.totals.collectionRate)}`}
          />
        </div>
      ) : (
        <Alert>
          <AlertDescription>{MESSAGES.PNL.RATE_MISSING}</AlertDescription>
        </Alert>
      )}
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
      <p className="text-muted-foreground text-xs">
        Cash in hand by account arrives with month close (build step 2); quarterly charts with
        reports (step 3).
      </p>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="This month at a glance, from confirmed entries."
      />
      <Suspense fallback={<StatCardsSkeleton />}>
        <DashboardContent />
      </Suspense>
    </>
  );
}
