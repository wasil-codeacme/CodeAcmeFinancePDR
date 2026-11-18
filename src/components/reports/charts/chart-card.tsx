import Link from 'next/link';
import type { ReactNode } from 'react';

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type ChartCardProps = {
  title: string;
  description: string;
  tableHref: string;
  children: ReactNode;
};

/** Each chart has its table one click away (the accessible view of the same figures). */
export function ChartCard({ title, description, tableHref, children }: ChartCardProps) {
  return (
    // min-w-0 lets the card shrink inside a grid column, so the chart measures its real width.
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <Link href={tableHref} className="text-muted-foreground text-xs hover:underline">
            View as table
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="min-w-0">{children}</CardContent>
    </Card>
  );
}
