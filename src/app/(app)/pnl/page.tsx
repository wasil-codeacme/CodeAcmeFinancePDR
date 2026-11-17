import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { PendingSection } from '@/components/layout/pending-navigation';
import { DistributionTable } from '@/components/pnl/distribution-table';
import { PnlStatement } from '@/components/pnl/pnl-statement';
import { MonthPicker } from '@/components/shared/month-picker';
import { PageHeader } from '@/components/shared/page-header';
import { ControlsSkeleton, TableSkeleton } from '@/components/shared/skeletons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SEARCH_PARAM } from '@/lib/constants';
import { MESSAGES } from '@/lib/messages';
import { formatMonthLabel, monthFromSearchParam } from '@/lib/month';
import { PERMISSION, hasPermission } from '@/lib/permissions';
import { ROUTES } from '@/lib/routes';
import { requireBooksUser } from '@/server/auth/current-user';
import { PNL_RESULT } from '@/server/read-models/monthly-pnl';
import { getMonthlyPnl } from '@/server/services/pnl.service';

export const metadata: Metadata = { title: 'P&L' };

async function PnlContent({ searchParams }: Pick<PageProps<'/pnl'>, 'searchParams'>) {
  const [user, params] = await Promise.all([
    requireBooksUser(PERMISSION.REPORTS_VIEW),
    searchParams,
    connection(),
  ]);
  const month = monthFromSearchParam(params[SEARCH_PARAM.MONTH], new Date());
  const canSeeDistribution = hasPermission(user.role, PERMISSION.DISTRIBUTION_VIEW);
  const result = await getMonthlyPnl(month, { includeDistribution: canSeeDistribution });

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MonthPicker month={month} />
        {result.kind === PNL_RESULT.READY && result.closedAt ? (
          <Badge variant="secondary">Closed — figures as closed</Badge>
        ) : null}
      </div>
      <PendingSection fallback={<TableSkeleton rows={14} />}>
        {result.kind === PNL_RESULT.READY ? (
          <div className="grid gap-6">
            <PnlStatement pnl={result.pnl} currency={result.currencies.reporting} />
            {canSeeDistribution ? (
              <section className="grid gap-3">
                <h2 className="text-lg font-semibold tracking-tight">
                  Partner profit distribution
                </h2>
                {result.pnl.distribution ? (
                  <DistributionTable
                    distribution={result.pnl.distribution}
                    currencies={result.currencies}
                  />
                ) : (
                  <Alert>
                    <AlertDescription>{MESSAGES.PNL.NO_SPLIT}</AlertDescription>
                  </Alert>
                )}
                {result.rate && result.rate.month !== month ? (
                  <p className="text-muted-foreground text-xs">
                    Using the {formatMonthLabel(result.rate.month)} rate ({result.rate.value}); set
                    one for this month in Settings.
                  </p>
                ) : null}
              </section>
            ) : null}
          </div>
        ) : (
          <Alert>
            <AlertDescription className="flex flex-wrap items-center gap-3">
              {MESSAGES.PNL.RATE_MISSING}
              <Button asChild size="sm" variant="outline">
                <Link href={ROUTES.SETTINGS.RATES}>Exchange rates</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </PendingSection>
    </div>
  );
}

export default function PnlPage({ searchParams }: PageProps<'/pnl'>) {
  return (
    <>
      <PageHeader
        eyebrow="Reports"
        title="Profit & loss"
        description="From confirmed entries only. Externally funded costs are shown separately and stay out of company profit."
      />
      <Suspense
        fallback={
          <div className="grid gap-5">
            <ControlsSkeleton />
            <TableSkeleton rows={14} />
          </div>
        }
      >
        <PnlContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
