'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment, Suspense } from 'react';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { navItemFor } from '@/lib/navigation';
import { ROUTES } from '@/lib/routes';

const DETAIL_CRUMB = 'Details';
const ONBOARDING_CRUMB = 'Set up';

type Crumb = { label: string; href: string };

/** Breadcrumbs come from the URL and the navigation list, so new sections get them for free. */
function crumbsFor(pathname: string): Crumb[] {
  const crumbs: Crumb[] = [{ label: 'Home', href: ROUTES.HOME }];
  if (pathname === ROUTES.ONBOARDING)
    return [...crumbs, { label: ONBOARDING_CRUMB, href: pathname }];
  const item = navItemFor(pathname);
  if (!item || item.href === ROUTES.HOME) return crumbs;
  crumbs.push({ label: item.label, href: item.href });
  if (pathname !== item.href && !pathname.startsWith(ROUTES.SETTINGS.ROOT)) {
    crumbs.push({ label: DETAIL_CRUMB, href: pathname });
  }
  return crumbs;
}

function PlatformBreadcrumbs() {
  const crumbs = crumbsFor(usePathname());
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.href}>
            {index > 0 ? <BreadcrumbSeparator /> : null}
            <BreadcrumbItem>
              {index === crumbs.length - 1 ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function PlatformHeader() {
  return (
    <header className="bg-background/80 sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur-md [view-transition-name:app-header] md:px-6">
      {/* Phones navigate with the bottom tab bar, so the sidebar toggle is desktop-only. */}
      <SidebarTrigger className="-ml-1 max-md:hidden" />
      <Separator
        orientation="vertical"
        className="mr-1 data-[orientation=vertical]:h-4 max-md:hidden"
      />
      {/* The pathname is only known per request, so the crumbs stream in after the static shell. */}
      <Suspense fallback={<Skeleton className="h-4 w-40" />}>
        <PlatformBreadcrumbs />
      </Suspense>
    </header>
  );
}
