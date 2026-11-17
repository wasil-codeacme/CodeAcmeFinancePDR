'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { formatCurrency, formatRatioAsPercent } from '@/lib/format';
import type { ChartDatum, ChartSeries } from '@/types/charts';

const BAR_RADIUS = 4;
const MAX_BAR_SIZE = 28;
const LINE_WIDTH = 2;
const MARKER_RADIUS = 4;
const SURFACE_GAP = 2;
const ROW_HEIGHT = 34;
const AXIS_PADDING = 48;

/** Colours follow the series' fixed slot, never their rank (dataviz: assign in order). */
export function chartConfig(series: readonly ChartSeries[]): ChartConfig {
  return Object.fromEntries(
    series.map((entry, index) => [
      entry.key,
      { label: entry.label, color: `var(--chart-${index + 1})` },
    ]),
  );
}

function compactMoney(currency: string) {
  const format = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  });
  return (value: number) => format.format(value);
}

function hasData(data: readonly ChartDatum[], keys: readonly string[]): boolean {
  return data.some((datum) =>
    keys.some((key) => typeof datum[key] === 'number' && datum[key] !== 0),
  );
}

type ChartCardProps = {
  title: string;
  description: string;
  tableHref: string;
  children: ReactNode;
};

/** Each chart has its table one click away (the accessible view of the same figures). */
export function ChartCard({ title, description, tableHref, children }: ChartCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <Link href={tableHref} className="text-muted-foreground text-xs hover:underline">
            View as table
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function NothingToChart() {
  return (
    <p className="text-muted-foreground flex h-48 items-center justify-center text-sm">
      Nothing to chart for this period.
    </p>
  );
}

function tooltipFor(config: ChartConfig, format: (value: number) => string) {
  return (
    <ChartTooltipContent
      formatter={(value, name, item) => (
        <div className="flex w-full items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span
              className="size-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: item.color ?? item.payload?.fill }}
            />
            {config[String(name)]?.label ?? name}
          </span>
          <span className="font-medium tabular-nums">
            {typeof value === 'number' ? format(value) : '—'}
          </span>
        </div>
      )}
    />
  );
}

type BarsProps = {
  data: ChartDatum[];
  series: readonly ChartSeries[];
  currency: string;
  stacked?: boolean;
};

/** Grouped or stacked bars over periods; thin bars, rounded at the data end, gaps between fills. */
export function PeriodBars({ data, series, currency, stacked = false }: BarsProps) {
  const config = chartConfig(series);
  const keys = series.map((entry) => entry.key);
  if (!hasData(data, keys)) return <NothingToChart />;
  const axis = compactMoney(currency);
  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <BarChart data={data} margin={{ left: 4, right: 4 }}>
        <CartesianGrid vertical={false} strokeOpacity={0.5} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={axis} />
        <ReferenceLine y={0} stroke="var(--border)" />
        <ChartTooltip
          cursor={{ fillOpacity: 0.3 }}
          content={tooltipFor(config, (value) => formatCurrency(value, currency))}
        />
        {series.length > 1 ? <ChartLegend content={<ChartLegendContent />} /> : null}
        {series.map((entry, index) => (
          <Bar
            key={entry.key}
            dataKey={entry.key}
            fill={`var(--color-${entry.key})`}
            maxBarSize={MAX_BAR_SIZE}
            stackId={stacked ? 'stack' : undefined}
            stroke={stacked ? 'var(--card)' : undefined}
            strokeWidth={stacked ? SURFACE_GAP : 0}
            radius={!stacked || index === series.length - 1 ? [BAR_RADIUS, BAR_RADIUS, 0, 0] : 0}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

/** One series ranked biggest first, labelled directly (no legend needed for a single series). */
export function RankedBars({ data, currency }: { data: ChartDatum[]; currency: string }) {
  const config: ChartConfig = { value: { label: 'Net revenue', color: 'var(--chart-1)' } };
  if (!hasData(data, ['value'])) return <NothingToChart />;
  const label = compactMoney(currency);
  return (
    <ChartContainer
      config={config}
      className="aspect-auto w-full"
      style={{ height: data.length * ROW_HEIGHT + AXIS_PADDING }}
    >
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 56 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          width={112}
          tickFormatter={(value: string) => (value.length > 16 ? `${value.slice(0, 15)}…` : value)}
        />
        <ChartTooltip
          cursor={{ fillOpacity: 0.3 }}
          content={tooltipFor(config, (value) => formatCurrency(value, currency))}
        />
        <Bar
          dataKey="value"
          fill="var(--color-value)"
          maxBarSize={22}
          radius={[0, BAR_RADIUS, BAR_RADIUS, 0]}
        >
          <LabelList
            dataKey="value"
            position="right"
            className="fill-foreground"
            fontSize={11}
            formatter={(value: unknown) => (typeof value === 'number' ? label(value) : '')}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

/** Margin month by month; gaps where a month had no revenue (margin is blank then). */
export function MarginLine({ data }: { data: ChartDatum[] }) {
  const config: ChartConfig = { margin: { label: 'Margin', color: 'var(--chart-1)' } };
  if (!data.some((datum) => typeof datum.margin === 'number')) return <NothingToChart />;
  const percent = (value: number) => formatRatioAsPercent(value);
  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <LineChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} strokeOpacity={0.5} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={percent} />
        <ReferenceLine y={0} stroke="var(--border)" />
        <ChartTooltip content={tooltipFor(config, percent)} />
        <Line
          dataKey="margin"
          type="monotone"
          stroke="var(--color-margin)"
          strokeWidth={LINE_WIDTH}
          dot={{
            r: MARKER_RADIUS,
            strokeWidth: SURFACE_GAP,
            stroke: 'var(--card)',
            fill: 'var(--color-margin)',
          }}
          activeDot={{ r: MARKER_RADIUS + 1 }}
          connectNulls={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
