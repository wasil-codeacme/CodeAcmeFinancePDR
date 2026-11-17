import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { EmptyState } from '@/components/shared/empty-state';
import { Money } from '@/components/shared/money';
import { PageHeader } from '@/components/shared/page-header';
import { TableSkeleton } from '@/components/shared/skeletons';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EntryStatus, RevenueKind } from '@/generated/prisma/enums';
import { SEARCH_PARAM } from '@/lib/constants';
import { INVOICE_STATUS_LABEL, PROJECT_STATUS_LABEL } from '@/lib/labels';
import { formatMonthLabel } from '@/lib/month';
import { PERMISSION } from '@/lib/permissions';
import { ROUTES, withSearchParams } from '@/lib/routes';
import { requireBooksUser } from '@/server/auth/current-user';
import { getClient, getClientHistory } from '@/server/services/client.service';

export const metadata: Metadata = { title: 'Client' };

async function ClientHistory({ params }: Pick<PageProps<'/clients/[clientId]'>, 'params'>) {
  await requireBooksUser(PERMISSION.ENTRIES_WRITE);
  const { clientId } = await params;
  const [client, history] = await Promise.all([getClient(clientId), getClientHistory(clientId)]);
  if (!client) notFound();
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Client"
        title={client.name}
        description={`${history.length} entries across all months.`}
      />
      {history.length === 0 ? (
        <EmptyState title="No revenue booked for this client yet" />
      ) : (
        <div className="bg-card overflow-x-auto rounded-xl border shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invoice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      className="hover:underline"
                      href={withSearchParams(ROUTES.REVENUE, {
                        [SEARCH_PARAM.MONTH]: row.bookingMonth,
                      })}
                    >
                      {formatMonthLabel(row.bookingMonth)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {row.projectName ?? row.description ?? '—'}{' '}
                    {row.status === EntryStatus.DRAFT ? (
                      <Badge variant="outline">Draft</Badge>
                    ) : null}
                    {row.kind === RevenueKind.STANDALONE ? (
                      <Badge variant="outline">Receivable only</Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    <Money value={row.figures.gross} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money value={row.figures.net} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money value={row.figures.received} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money value={row.figures.outstanding} />
                  </TableCell>
                  <TableCell>{PROJECT_STATUS_LABEL[row.projectStatus]}</TableCell>
                  <TableCell>{INVOICE_STATUS_LABEL[row.invoiceStatus]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/** PRD §5.1: one client's history across months. The name comes from data, so the header skeletons too. */
export default function ClientDetailPage({ params }: PageProps<'/clients/[clientId]'>) {
  return (
    <Suspense
      fallback={
        <div className="grid gap-6 pt-6">
          <Skeleton className="h-9 w-64" />
          <TableSkeleton />
        </div>
      }
    >
      <ClientHistory params={params} />
    </Suspense>
  );
}
