'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { NAV_ICONS } from '@/components/layout/nav-icons';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import type { Role } from '@/generated/prisma/enums';
import { NAV_ITEMS, navItemFor } from '@/lib/navigation';
import { hasPermission } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const TAB_CLASS =
  'h-auto flex-1 flex-col gap-0.5 rounded-xl px-0 py-1.5 text-[0.68rem] font-medium hover:bg-transparent';
const ICON_PILL_CLASS =
  'flex h-7 w-12 items-center justify-center rounded-full transition-colors [&_svg]:size-5';

/** Phone navigation: the daily screens one tap away; everything else sits behind "More" (the sidebar). */
export function MobileTabBar({ role }: { role: Role }) {
  const activeHref = navItemFor(usePathname())?.href;
  const { setOpenMobile } = useSidebar();
  const tabs = NAV_ITEMS.filter((item) => item.inTabBar && hasPermission(role, item.permission));
  return (
    <nav
      aria-label="Main"
      className="bg-background/90 fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <div className="mx-auto flex max-w-md items-stretch gap-1 px-2 pt-1.5 pb-1">
        {tabs.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          const active = item.href === activeHref;
          return (
            <Button
              key={item.href}
              asChild
              variant="ghost"
              className={cn(TAB_CLASS, active ? 'text-primary' : 'text-muted-foreground')}
            >
              <Link href={item.href} aria-current={active ? 'page' : undefined}>
                <span className={cn(ICON_PILL_CLASS, active && 'bg-accent')}>
                  <Icon />
                </span>
                {item.shortLabel}
              </Link>
            </Button>
          );
        })}
        <Button
          type="button"
          variant="ghost"
          onClick={() => setOpenMobile(true)}
          className={cn(TAB_CLASS, 'text-muted-foreground')}
        >
          <span className={ICON_PILL_CLASS}>
            <Menu />
          </span>
          More
        </Button>
      </div>
    </nav>
  );
}
