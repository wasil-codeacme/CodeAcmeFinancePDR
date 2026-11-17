import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AddClientButton, ClientsList } from '@/components/clients/clients-list';
import { PageHeader } from '@/components/shared/page-header';
import { CardListSkeleton } from '@/components/shared/skeletons';
import { Skeleton } from '@/components/ui/skeleton';
import { PERMISSION } from '@/lib/permissions';
import { requireBooksUser } from '@/server/auth/current-user';
import { listClients } from '@/server/services/client.service';
import { listPlatforms } from '@/server/services/platform.service';

export const metadata: Metadata = { title: 'Clients' };

async function ClientsContent() {
  await requireBooksUser(PERMISSION.ENTRIES_WRITE);
  const [clients, platforms] = await Promise.all([listClients(), listPlatforms()]);
  const platformOptions = platforms.map((platform) => ({
    value: platform.id,
    label: platform.name,
  }));
  return (
    <div className="grid gap-5">
      <div className="flex justify-end">
        <AddClientButton platforms={platformOptions} />
      </div>
      <ClientsList clients={clients} platforms={platformOptions} />
    </div>
  );
}

export default function ClientsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Books"
        title="Clients"
        description="Clients and their projects, with the platform and fee defaults revenue picks up."
      />
      <Suspense
        fallback={
          <div className="grid gap-5">
            <Skeleton className="ml-auto h-8 w-32 rounded-lg" />
            <CardListSkeleton />
          </div>
        }
      >
        <ClientsContent />
      </Suspense>
    </>
  );
}
