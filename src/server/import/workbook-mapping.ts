import { InvoiceStatus, PnlLine, ProjectStatus, SalesChannel } from '@/generated/prisma/enums';
import { INVOICE_STATUS_LABEL, PROJECT_STATUS_LABEL } from '@/lib/labels';
import type { ParsedRevenueLine } from '@/server/import/workbook-parser';

/** Second rows for part-paid projects were labelled "… - Receivables"; they belong to the same client. */
const RECEIVABLE_SUFFIX = /\s*-\s*receiv\w*$/i;
const CLIENT_PLATFORM_SEPARATOR = ' - ';

/** The workbook's five expense sections, mapped to the P&L lines they appear under. */
const SECTION_PNL_LINE: Record<string, PnlLine> = {
  'operations overhead': PnlLine.OPERATIONS_OVERHEAD,
  'operations salaries': PnlLine.OPERATIONS_SALARIES,
  'management salaries & overhead': PnlLine.MANAGEMENT,
  'sales salaries': PnlLine.SALES_SALARIES,
  'sales overheads': PnlLine.SALES_OVERHEAD,
};

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function pnlLineForSection(section: string): PnlLine {
  return SECTION_PNL_LINE[normalizeName(section)] ?? PnlLine.OPERATIONS_OVERHEAD;
}

/**
 * Splits "Client X - Upwork" / "Client I Upwork" into client and platform. Months with a
 * separate platform column pass it through; otherwise a trailing known platform name is
 * peeled off the label.
 */
export function splitClientAndPlatform(
  line: Pick<ParsedRevenueLine, 'clientLabel' | 'platformLabel'>,
  platformNames: readonly string[],
): { clientName: string; platformName: string | null; projectName: string | null } {
  const label = line.clientLabel.replace(RECEIVABLE_SUFFIX, '').trim();
  if (line.platformLabel) {
    return { clientName: label, platformName: line.platformLabel, projectName: null };
  }
  const isPlatform = (name: string) =>
    platformNames.some((platform) => normalizeName(platform) === normalizeName(name));
  const separatorIndex = label.lastIndexOf(CLIENT_PLATFORM_SEPARATOR);
  if (separatorIndex > 0) {
    const clientName = label.slice(0, separatorIndex).trim();
    const suffix = label.slice(separatorIndex + CLIENT_PLATFORM_SEPARATOR.length).trim();
    // A known platform after the dash is a platform; anything else names a project.
    return isPlatform(suffix)
      ? { clientName, platformName: suffix, projectName: null }
      : { clientName, platformName: null, projectName: suffix };
  }
  const lowered = label.toLowerCase();
  const platform = platformNames.find((name) => lowered.endsWith(` ${name.toLowerCase()}`));
  if (platform) {
    return {
      clientName: label.slice(0, label.length - platform.length).trim(),
      platformName: platform,
      projectName: null,
    };
  }
  return { clientName: label, platformName: null, projectName: null };
}

function fromLabel<TValue extends string>(
  labels: Record<TValue, string>,
  text: string | null,
  fallback: TValue,
): TValue {
  if (text === null) return fallback;
  // Object.keys widens to string[]; the keys of a Record<TValue, …> are exactly TValue.
  const match = (Object.keys(labels) as TValue[]).find(
    (value) => normalizeName(labels[value]) === normalizeName(text),
  );
  return match ?? fallback;
}

export function projectStatusFrom(text: string | null): ProjectStatus {
  return fromLabel(PROJECT_STATUS_LABEL, text, ProjectStatus.IN_PROGRESS);
}

export function invoiceStatusFrom(text: string | null): InvoiceStatus {
  return fromLabel(INVOICE_STATUS_LABEL, text, InvoiceStatus.INITIATED);
}

const CHANNEL_KEYWORDS: readonly (readonly [string, SalesChannel])[] = [
  ['upwork', SalesChannel.UPWORK],
  ['cold email', SalesChannel.COLD_EMAIL],
  ['cold call', SalesChannel.COLD_CALL],
  ['linkedin', SalesChannel.LINKEDIN],
];

/**
 * The workbook names sales costs after their channel ("Upwork Connects", "Cold Call Tools"),
 * so an imported sales line can be tagged for Sales CAC; anything unclear stays untagged.
 */
export function salesChannelFromItem(item: string): SalesChannel | null {
  const name = normalizeName(item);
  return CHANNEL_KEYWORDS.find(([keyword]) => name.includes(keyword))?.[1] ?? null;
}
