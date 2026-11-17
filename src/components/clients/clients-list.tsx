'use client';

import { Pencil, Plus } from 'lucide-react';
import Link from 'next/link';

import {
  CreateClientForm,
  CreateProjectForm,
  EditClientForm,
  EditProjectForm,
} from '@/components/clients/client-forms';
import { EmptyState } from '@/components/shared/empty-state';
import { FormDialog } from '@/components/shared/form-dialog';
import { Badge } from '@/components/ui/badge';
import { IconButton } from '@/components/shared/icon-button';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPercentValue } from '@/lib/format';
import { PROJECT_STATUS_LABEL } from '@/lib/labels';
import { ROUTES } from '@/lib/routes';
import type { ClientRecord } from '@/server/repositories/client.repository';

type PlatformOption = { value: string; label: string };

export function AddClientButton({ platforms }: { platforms: PlatformOption[] }) {
  return (
    <FormDialog
      title="Add client"
      trigger={
        <Button>
          <Plus /> Add client
        </Button>
      }
    >
      {(close) => <CreateClientForm platforms={platforms} onDone={close} />}
    </FormDialog>
  );
}

export function ClientsList({
  clients,
  platforms,
}: {
  clients: ClientRecord[];
  platforms: PlatformOption[];
}) {
  const platformName = (id: string | null) =>
    platforms.find((platform) => platform.value === id)?.label ?? null;
  if (clients.length === 0) {
    return (
      <EmptyState
        title="No clients yet"
        description="Create a client once and pick it from a list afterwards."
      />
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {clients.map((client) => (
        <Card key={client.id}>
          <CardHeader>
            <CardTitle>
              <Link href={ROUTES.CLIENT_DETAIL(client.id)} className="hover:underline">
                {client.name}
              </Link>{' '}
              {!client.active ? <Badge variant="secondary">Inactive</Badge> : null}
            </CardTitle>
            <CardAction className="flex gap-1">
              <FormDialog
                title={`New project for ${client.name}`}
                trigger={
                  <Button size="sm" variant="ghost">
                    <Plus /> Project
                  </Button>
                }
              >
                {(close) => (
                  <CreateProjectForm clientId={client.id} platforms={platforms} onDone={close} />
                )}
              </FormDialog>
              <FormDialog
                title="Edit client"
                trigger={
                  <IconButton size="icon-sm" variant="ghost" label={`Edit ${client.name}`}>
                    <Pencil />
                  </IconButton>
                }
              >
                {(close) => <EditClientForm client={client} platforms={platforms} onDone={close} />}
              </FormDialog>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-2">
            <p className="text-muted-foreground text-xs">
              {platformName(client.defaultPlatformId) ?? 'No default platform'}
              {client.defaultFeePercent
                ? ` · fee ${formatPercentValue(client.defaultFeePercent)}`
                : ''}
            </p>
            {client.projects.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No projects — revenue can still be booked to the client.
              </p>
            ) : (
              <ul className="divide-y">
                {client.projects.map((project) => (
                  <li
                    key={project.id}
                    className="flex items-center justify-between gap-2 py-1.5 text-sm"
                  >
                    <span>
                      {project.name}{' '}
                      <span className="text-muted-foreground text-xs">
                        {PROJECT_STATUS_LABEL[project.status]}
                        {platformName(project.platformId)
                          ? ` · ${platformName(project.platformId)}`
                          : ''}
                      </span>
                    </span>
                    <FormDialog
                      title="Edit project"
                      trigger={
                        <IconButton size="icon-sm" variant="ghost" label={`Edit ${project.name}`}>
                          <Pencil />
                        </IconButton>
                      }
                    >
                      {(close) => (
                        <EditProjectForm project={project} platforms={platforms} onDone={close} />
                      )}
                    </FormDialog>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
