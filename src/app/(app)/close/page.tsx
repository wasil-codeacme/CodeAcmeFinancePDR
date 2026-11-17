import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { CloseChecklist } from '@/components/close/close-checklist';
import { ReservesAndAdvances } from '@/components/close/reserves-and-advances';
import { PendingSection } from '@/components/layout/pending-navigation';
import { DistributionTable } from '@/components/pnl/distribution-table';
import { PnlStatement } from '@/components/pnl/pnl-statement';
import { MonthPicker } from '@/components/shared/month-picker';
import { PageHeader } from '@/components/shared/page-header';
import { ControlsSkeleton, FormCardSkeleton, TableSkeleton } from '@/components/shared/skeletons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { SEARCH_PARAM } from '@/lib/constants';
import { MESSAGES } from '@/lib/messages';
import { monthFromSearchParam } from '@/lib/month';
import { PERMISSION } from '@/lib/permissions';
import { requireBooksUser } from '@/server/auth/current-user';
import { PNL_RESULT } from '@/server/read-models/monthly-pnl';
import { getCloseOverview } from '@/server/services/period.service';

export const metadata: Metadata = { title: 'Month close' };

const CLOSED_AT_FORMAT = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });

async function CloseContent({ searchParams }: Pick<PageProps<'/close'>, 'searchParams'>) {
  const [, params] = await Promise.all([
    requireBooksUser(PERMISSION.PERIOD_CLOSE),
    searchParams,
    connection(),
  ]);
  const month = monthFromSearchParam(params[SEARCH_PARAM.MONTH], new Date());
  const overview = await getCloseOverview(month);
  const { pnl } = overview;
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MonthPicker month={month} />
        {overview.isClosed ? (
          <Badge variant="secondary">
            Closed{overview.closedAt ? ` ${CLOSED_AT_FORMAT.format(overview.closedAt)}` : ''}
          </Badge>
        ) : (
          <Badge variant="outline">Open</Badge>
        )}
      </div>
      <PendingSection fallback={<FormCardSkeleton />}>
        <CloseChecklist month={month} checks={overview.checks} isClosed={overview.isClosed} />
        <ReservesAndAdvances
          month={month}
          reserves={overview.reserves}
          advances={overview.advances}
          readOnly={overview.isClosed}
        />
        {pnl.kind === PNL_RESULT.READY ? (
          <div className="grid gap-4">
            <PnlStatement pnl={pnl.pnl} currency={pnl.currencies.reporting} />
            {pnl.pnl.distribution ? (
              <DistributionTable distribution={pnl.pnl.distribution} currencies={pnl.currencies} />
            ) : (
              <Alert>
                <AlertDescription>{MESSAGES.PNL.NO_SPLIT}</AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <Alert>
            <AlertDescription>{MESSAGES.PNL.RATE_MISSING}</AlertDescription>
          </Alert>
        )}
      </PendingSection>
    </div>
  );
}

export default function ClosePage({ searchParams }: PageProps<'/close'>) {
  return (
    <>
      <PageHeader
        eyebrow="Month end"
        title="Month close"
        description="Check the month, close it to lock the figures and post each partner's share. Closed months are read-only."
      />
      <Suspense
        fallback={
          <div className="grid gap-5">
            <ControlsSkeleton />
            <FormCardSkeleton />
            <TableSkeleton rows={10} />
          </div>
        }
      >
        <CloseContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
