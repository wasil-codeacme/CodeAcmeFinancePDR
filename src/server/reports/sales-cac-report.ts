import type { SalesChannel } from '@/generated/prisma/enums';
import { SALES_CHANNEL_LABEL } from '@/lib/labels';
import type { ReportColumn } from '@/lib/report-period';
import {
  type ChannelCac,
  SALES_CHANNEL_ORDER,
  type SalesCac,
  computeSalesCac,
} from '@/server/domain/sales-cac';
import type { SalesCacData } from '@/server/read-models/sales-cac';
import { countRow, hasFigures, moneyRow } from '@/server/reports/report-rows';
import { ROW_TONE, type ReportRow, type ReportSection } from '@/types/report';

function cacByColumn(columns: readonly ReportColumn[], data: SalesCacData): SalesCac[] {
  return columns.map((column) => {
    const months = column.months.map((month) => data.byMonth.get(month));
    return computeSalesCac(
      months.flatMap((month) => month?.spend ?? []),
      months.flatMap((month) => month?.activity ?? []),
    );
  });
}

function channelRows(key: string, figures: readonly ChannelCac[]): ReportRow[] {
  return [
    moneyRow(
      `${key}-spend`,
      'Spend',
      figures.map((figure) => figure.spend),
      {
        tone: ROW_TONE.SUBTOTAL,
      },
    ),
    countRow(
      `${key}-interested`,
      'Interested responses',
      figures.map((figure) => figure.interestedResponses),
    ),
    moneyRow(
      `${key}-per-interested`,
      'Cost per interested response',
      figures.map((figure) => figure.costPerInterested),
      { tone: ROW_TONE.MUTED },
    ),
    countRow(
      `${key}-leads`,
      'Leads closed',
      figures.map((figure) => figure.leadsClosed),
    ),
    moneyRow(
      `${key}-per-lead`,
      'Cost per closed lead',
      figures.map((figure) => figure.costPerLead),
      {
        tone: ROW_TONE.MUTED,
      },
    ),
    countRow(
      `${key}-calls`,
      'Calls made',
      figures.map((figure) => figure.callsMade),
    ),
  ];
}

function figuresFor(cac: readonly SalesCac[], channel: SalesChannel): ChannelCac[] {
  return cac.flatMap((column) =>
    column.channels.filter((candidate) => candidate.channel === channel),
  );
}

/**
 * PRD §5.8, the workbook's "CodeAcme Sales CAC" sheet: spend per channel, cost per interested
 * response and per closed lead. Channels with nothing in the period are left out.
 */
export function buildSalesCacSections(
  columns: readonly ReportColumn[],
  data: SalesCacData,
): ReportSection[] {
  const cac = cacByColumn(columns, data);
  const channelSections = SALES_CHANNEL_ORDER.flatMap((channel) => {
    const rows = channelRows(channel, figuresFor(cac, channel));
    return rows.some(hasFigures)
      ? [{ key: channel, title: SALES_CHANNEL_LABEL[channel], rows }]
      : [];
  });
  const untagged = moneyRow(
    'untagged',
    'Sales spend not tagged with a channel',
    cac.map((column) => column.untaggedSpend),
    { tone: ROW_TONE.MUTED },
  );
  return [
    ...channelSections,
    {
      key: 'total',
      title: 'All sales',
      note: 'Every sales expense, tagged or not, so the total ties to the sales lines of the P&L.',
      rows: [
        ...(hasFigures(untagged) ? [untagged] : []),
        ...channelRows(
          'total',
          cac.map((column) => column.total),
        ),
      ],
    },
  ];
}
