import {
  AuditAction,
  EntryStatus,
  InvoiceStatus,
  ProjectStatus,
  RevenueKind,
} from '@/generated/prisma/enums';
import { AUDIT_ENTITY } from '@/lib/constants';
import { MESSAGES } from '@/lib/messages';
import { addMonths, type MonthKey } from '@/lib/month';
import { PERMISSION, hasPermission } from '@/lib/permissions';
import { resolveDefaultFee } from '@/server/domain/fee-default';
import { summarizeReceivables } from '@/server/domain/revenue-math';
import { figuresOf, toReceivableTotalsView, toRevenueRow } from '@/server/domain/revenue-view';
import { ForbiddenError, NotFoundError, RuleViolationError } from '@/server/errors';
import { auditedChange, auditedCreate } from '@/server/repositories/audited-write';
import { clientRepository, projectRepository } from '@/server/repositories/client.repository';
import { runInTransaction } from '@/server/repositories/db';
import { platformRepository } from '@/server/repositories/platform.repository';
import { type RevenueFilters, revenueRepository } from '@/server/repositories/revenue.repository';
import type { CreateRevenueInput, UpdateRevenueInput } from '@/server/validators/revenue.schema';
import type { SessionUser } from '@/types/auth';
import type { ReceivableTotalsView, RevenueEntryRecord, RevenueRow } from '@/types/revenue';

export type RevenueMonthView = { rows: RevenueRow[]; totals: ReceivableTotalsView };

export async function getRevenueMonth(
  month: MonthKey,
  filters: RevenueFilters,
): Promise<RevenueMonthView> {
  const entries = await revenueRepository.listForMonth(month, filters);
  const confirmed = entries.filter((entry) => entry.status === EntryStatus.CONFIRMED);
  return {
    rows: entries.map(toRevenueRow),
    totals: toReceivableTotalsView(summarizeReceivables(confirmed.map(figuresOf))),
  };
}

async function requireEntry(id: string): Promise<RevenueEntryRecord> {
  const entry = await revenueRepository.findById(id);
  if (!entry) throw new NotFoundError();
  return entry;
}

async function defaultsFor(clientId: string, projectId: string | null, month: MonthKey) {
  const [client, project, platforms] = await Promise.all([
    clientRepository.findById(clientId),
    projectId ? projectRepository.findById(projectId) : Promise.resolve(null),
    platformRepository.list(),
  ]);
  if (!client) throw new NotFoundError();
  if (projectId && project?.clientId !== clientId) {
    throw new RuleViolationError(MESSAGES.REVENUE.PROJECT_CLIENT_MISMATCH);
  }
  return resolveDefaultFee({
    projectPlatformId: project?.platformId ?? null,
    projectFeeOverride: project?.feePercentOverride ?? null,
    clientPlatformId: client.defaultPlatformId,
    clientDefaultFee: client.defaultFeePercent,
    platforms,
    month,
  });
}

export async function createRevenueEntry(
  actor: SessionUser,
  input: CreateRevenueInput,
): Promise<RevenueEntryRecord> {
  const defaults = await defaultsFor(input.clientId, input.projectId, input.bookingMonth);
  return auditedCreate(actor.id, AUDIT_ENTITY.REVENUE_ENTRY, () =>
    revenueRepository.create(
      {
        kind: RevenueKind.BOOKED,
        status: EntryStatus.CONFIRMED,
        clientId: input.clientId,
        projectId: input.projectId,
        platformId: defaults.platformId,
        bookingMonth: input.bookingMonth,
        description: null,
        gross: input.gross,
        feePercent: defaults.feePercent,
        projectStatus: input.projectStatus,
        invoiceStatus: InvoiceStatus.INITIATED,
        referredBy: null,
        closedByTeamMemberId: null,
        expectedDate: null,
        notes: null,
      },
      actor.id,
    ),
  );
}

export async function updateRevenueEntry(
  actor: SessionUser,
  input: UpdateRevenueInput,
): Promise<RevenueEntryRecord> {
  const { id, ...changes } = input;
  return auditedChange(actor.id, {
    action: AuditAction.UPDATE,
    entityType: AUDIT_ENTITY.REVENUE_ENTRY,
    entityId: id,
    loadBefore: () => requireEntry(id),
    apply: () => revenueRepository.update(id, changes, actor.id),
  });
}

/** Drafts can be discarded by anyone who books; deleting confirmed entries is founder-only (PRD §3). */
export async function deleteRevenueEntry(actor: SessionUser, id: string): Promise<void> {
  const entry = await requireEntry(id);
  if (
    entry.status === EntryStatus.CONFIRMED &&
    !hasPermission(actor.role, PERMISSION.ENTRIES_DELETE_CONFIRMED)
  ) {
    throw new ForbiddenError();
  }
  await auditedChange(actor.id, {
    action: AuditAction.DELETE,
    entityType: AUDIT_ENTITY.REVENUE_ENTRY,
    entityId: id,
    loadBefore: async () => entry,
    apply: () => revenueRepository.softDelete(id, actor.id),
  });
}

export async function confirmRevenueEntry(
  actor: SessionUser,
  id: string,
): Promise<RevenueEntryRecord> {
  const entry = await requireEntry(id);
  if (entry.gross === null) throw new RuleViolationError(MESSAGES.REVENUE.DRAFT_NEEDS_AMOUNT);
  return auditedChange(actor.id, {
    action: AuditAction.UPDATE,
    entityType: AUDIT_ENTITY.REVENUE_ENTRY,
    entityId: id,
    loadBefore: async () => entry,
    apply: () => revenueRepository.update(id, { status: EntryStatus.CONFIRMED }, actor.id),
  });
}

/** PRD §5.1: drafts, amounts blank, for last month's projects still in progress. */
export async function copyInProgressFromLastMonth(
  actor: SessionUser,
  month: MonthKey,
): Promise<number> {
  const previous = await revenueRepository.listForMonth(addMonths(month, -1), {});
  const candidates = previous.filter((entry) => entry.projectStatus === ProjectStatus.IN_PROGRESS);
  if (candidates.length === 0) throw new RuleViolationError(MESSAGES.REVENUE.NO_DRAFTS_TO_COPY);
  const toCopy: { entry: RevenueEntryRecord; defaults: Awaited<ReturnType<typeof defaultsFor>> }[] =
    [];
  for (const entry of candidates) {
    if (await revenueRepository.existsForProjectInMonth(entry.clientId, entry.projectId, month))
      continue;
    toCopy.push({ entry, defaults: await defaultsFor(entry.clientId, entry.projectId, month) });
  }
  // One connection serves a transaction, so its queries run one after another, not in parallel.
  await runInTransaction(async () => {
    for (const { entry, defaults } of toCopy) {
      await auditedCreate(actor.id, AUDIT_ENTITY.REVENUE_ENTRY, () =>
        revenueRepository.create(
          {
            kind: RevenueKind.BOOKED,
            status: EntryStatus.DRAFT,
            clientId: entry.clientId,
            projectId: entry.projectId,
            platformId: entry.platformId ?? defaults.platformId,
            bookingMonth: month,
            description: entry.description,
            gross: null,
            feePercent: defaults.feePercent,
            projectStatus: ProjectStatus.IN_PROGRESS,
            invoiceStatus: InvoiceStatus.INITIATED,
            referredBy: entry.referredBy,
            closedByTeamMemberId: entry.closedByTeamMemberId,
            expectedDate: null,
            notes: null,
          },
          actor.id,
        ),
      );
    }
  });
  return toCopy.length;
}
