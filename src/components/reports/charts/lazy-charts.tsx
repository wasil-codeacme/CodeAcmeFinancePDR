'use client';

import { type ComponentProps, useEffect, useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';

type ChartModule = typeof import('@/components/reports/charts/chart-primitives');

// One shared download of the chart library for the whole page.
let chartModule: Promise<ChartModule> | null = null;

function loadCharts(): Promise<ChartModule> {
  chartModule ??= import('@/components/reports/charts/chart-primitives');
  return chartModule;
}

/**
 * The chart library is large, so it loads after the page is on screen. This is a plain
 * load-on-mount rather than `next/dynamic` with `ssr: false`: that option makes React hand
 * the whole surrounding streamed section to the browser, which cannot render server-only
 * content, so Next.js reloaded the page in a loop.
 */
function useCharts(): ChartModule | null {
  const [charts, setCharts] = useState<ChartModule | null>(null);
  useEffect(() => {
    let mounted = true;
    void loadCharts().then((loaded) => {
      if (mounted) setCharts(loaded);
    });
    return () => {
      mounted = false;
    };
  }, []);
  return charts;
}

function ChartSkeleton() {
  return <Skeleton className="h-64 w-full rounded-lg" />;
}

export function PeriodBars(props: ComponentProps<ChartModule['PeriodBars']>) {
  const charts = useCharts();
  return charts ? <charts.PeriodBars {...props} /> : <ChartSkeleton />;
}

export function RankedBars(props: ComponentProps<ChartModule['RankedBars']>) {
  const charts = useCharts();
  return charts ? <charts.RankedBars {...props} /> : <ChartSkeleton />;
}

export function MarginLine(props: ComponentProps<ChartModule['MarginLine']>) {
  const charts = useCharts();
  return charts ? <charts.MarginLine {...props} /> : <ChartSkeleton />;
}
