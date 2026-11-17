'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { SETTINGS_SECTIONS } from '@/lib/settings-sections';
import { cn } from '@/lib/utils';

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav
      className="-mx-4 flex gap-1 overflow-x-auto border-b px-4 md:mx-0 md:px-0"
      aria-label="Settings sections"
    >
      {SETTINGS_SECTIONS.map((meta) => {
        const active = pathname === meta.href;
        return (
          <Link
            key={meta.section}
            href={meta.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'text-muted-foreground hover:text-foreground -mb-px border-b-2 border-transparent px-3 py-2 text-sm whitespace-nowrap',
              active && 'border-foreground text-foreground font-medium',
            )}
          >
            {meta.label}
          </Link>
        );
      })}
    </nav>
  );
}
