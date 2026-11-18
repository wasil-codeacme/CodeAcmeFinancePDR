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
