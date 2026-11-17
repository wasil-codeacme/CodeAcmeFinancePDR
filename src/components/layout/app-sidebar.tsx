'use client';

import { Landmark } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { NAV_ICONS } from '@/components/layout/nav-icons';
import { UserMenu } from '@/components/layout/user-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import type { Role } from '@/generated/prisma/enums';
import { ROLE_LABEL } from '@/lib/labels';
import { NAV_GROUPS, navItemFor } from '@/lib/navigation';
import { hasPermission } from '@/lib/permissions';
import { ROUTES } from '@/lib/routes';

const NAV_SKELETON_ROWS = 6;

function SidebarBrand() {
  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" asChild>
            <Link href={ROUTES.HOME} prefetch>
              <span className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Landmark className="size-4" />
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="font-heading font-semibold tracking-tight">CodeAcme</span>
                <span className="text-muted-foreground text-xs">Finance</span>
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
}

type AppSidebarProps = { user: { name: string; email: string; role: Role } };

/** Only sections the user's role may open are listed (permissions are re-checked on the server). */
export function AppSidebar({ user }: AppSidebarProps) {
  const activeHref = navItemFor(usePathname())?.href;
  return (
    <Sidebar collapsible="icon">
      <SidebarBrand />
      <SidebarContent>
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => hasPermission(user.role, item.permission));
          if (items.length === 0) return null;
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const Icon = NAV_ICONS[item.icon];
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={item.href === activeHref}
                          tooltip={item.label}
                        >
                          <Link href={item.href} prefetch>
                            <Icon />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarFooter>
        <UserMenu name={user.name} email={user.email} roleLabel={ROLE_LABEL[user.role]} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function AppSidebarSkeleton() {
  return (
    <Sidebar collapsible="icon">
      <SidebarBrand />
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {Array.from({ length: NAV_SKELETON_ROWS }, (_, index) => (
              <SidebarMenuItem key={index} className="flex h-8 items-center gap-2 px-2">
                <Skeleton className="size-4 rounded-md" />
                <Skeleton className="h-4 w-3/5" />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
