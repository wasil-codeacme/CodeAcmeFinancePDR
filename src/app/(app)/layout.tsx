import { type ReactNode, Suspense, ViewTransition } from 'react';

import { AppSidebar, AppSidebarSkeleton } from '@/components/layout/app-sidebar';
import { DataVersionWatcher } from '@/components/layout/data-version-watcher';
import { MobileTabBar } from '@/components/layout/mobile-tab-bar';
import { NavigationProgress } from '@/components/layout/navigation-progress';
import { PendingNavigationProvider } from '@/components/layout/pending-navigation';
import { PlatformHeader } from '@/components/layout/platform-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { requireUser } from '@/server/auth/current-user';

async function SignedInNavigation() {
  const user = await requireUser();
  return (
    <>
      <AppSidebar user={{ name: user.name, email: user.email, role: user.role }} />
      <MobileTabBar role={user.role} />
      <DataVersionWatcher />
    </>
  );
}

/**
 * The shell (header, page titles) is static and renders instantly; only the user-specific
 * navigation and each page's data stream in behind Suspense (Cache Components).
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      {/* Reads the URL, which Cache Components only allows inside Suspense. */}
      <Suspense>
        <NavigationProgress />
      </Suspense>
      <Suspense fallback={<AppSidebarSkeleton />}>
        <SignedInNavigation />
      </Suspense>
      <SidebarInset className="bg-ledger min-w-0">
        <PlatformHeader />
        <div className="mx-auto w-full max-w-7xl flex-1 px-4 pt-2 pb-28 md:px-8 md:pb-16">
          <PendingNavigationProvider>
            {/* Navigations cross-fade the page content; the sidebar and top bar stay put. */}
            <ViewTransition>{children}</ViewTransition>
          </PendingNavigationProvider>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
