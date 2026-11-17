'use client';

import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';

import { GlowTracker } from '@/components/layout/glow-tracker';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

const TOOLTIP_DELAY_MS = 300;

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
        {children}
        <GlowTracker />
        <Toaster richColors closeButton position="bottom-right" />
      </TooltipProvider>
    </ThemeProvider>
  );
}
