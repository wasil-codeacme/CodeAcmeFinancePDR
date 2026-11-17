'use server';

import { PERMISSION } from '@/lib/permissions';
import { writeAction } from '@/server/actions/action';
import { CACHE_TAG } from '@/server/cache-tags';
import * as clientService from '@/server/services/client.service';
import * as receivableService from '@/server/services/receivable.service';
import * as revenueService from '@/server/services/revenue.service';
import {
  clientSchema,
  projectSchema,
  updateClientSchema,
  updateProjectSchema,
} from '@/server/validators/client.schema';
import {
  adjustReceivableSchema,
  copyRevenueSchema,
  createRevenueSchema,
  moveExpectedDateSchema,
  receiptIdSchema,
  recordReceiptSchema,
  releaseEscrowSchema,
  revenueIdSchema,
  standaloneReceivableSchema,
  updateRevenueSchema,
} from '@/server/validators/revenue.schema';

const WRITE = PERMISSION.ENTRIES_WRITE;
const CLIENTS_CACHE = [CACHE_TAG.CLIENTS] as const;
const DONE = true;

export const createClient = writeAction({
  schema: clientSchema,
  permission: WRITE,
  invalidates: CLIENTS_CACHE,
  handler: async (input, actor) => (await clientService.createClient(actor, input)).id,
});

export const updateClient = writeAction({
  schema: updateClientSchema,
  permission: WRITE,
  invalidates: CLIENTS_CACHE,
  handler: async ({ id, ...input }, actor) =>
    (await clientService.updateClient(actor, id, input)).id,
});

export const createProject = writeAction({
  schema: projectSchema,
  permission: WRITE,
  invalidates: CLIENTS_CACHE,
  handler: async (input, actor) => (await clientService.createProject(actor, input)).id,
});

export const updateProject = writeAction({
  schema: updateProjectSchema,
  permission: WRITE,
  invalidates: CLIENTS_CACHE,
  handler: async ({ id, ...input }, actor) =>
    (await clientService.updateProject(actor, id, input)).id,
});

export const createRevenueEntry = writeAction({
  schema: createRevenueSchema,
  permission: WRITE,
  handler: async (input, actor) => (await revenueService.createRevenueEntry(actor, input)).id,
});

export const updateRevenueEntry = writeAction({
  schema: updateRevenueSchema,
  permission: WRITE,
  handler: async (input, actor) => (await revenueService.updateRevenueEntry(actor, input)).id,
});

export const deleteRevenueEntry = writeAction({
  schema: revenueIdSchema,
  permission: WRITE,
  handler: async (input, actor) => {
    await revenueService.deleteRevenueEntry(actor, input.id);
    return DONE;
  },
});

export const confirmRevenueEntry = writeAction({
  schema: revenueIdSchema,
  permission: WRITE,
  handler: async (input, actor) => (await revenueService.confirmRevenueEntry(actor, input.id)).id,
});

export const copyRevenueFromLastMonth = writeAction({
  schema: copyRevenueSchema,
  permission: WRITE,
  handler: (input, actor) => revenueService.copyInProgressFromLastMonth(actor, input.month),
});

export const recordReceipt = writeAction({
  schema: recordReceiptSchema,
  permission: WRITE,
  handler: async (input, actor) => {
    await receivableService.recordReceipt(actor, input);
    return DONE;
  },
});

export const releaseEscrow = writeAction({
  schema: releaseEscrowSchema,
  permission: WRITE,
  handler: async (input, actor) => {
    await receivableService.releaseEscrow(actor, input);
    return DONE;
  },
});

export const deleteReceipt = writeAction({
  schema: receiptIdSchema,
  permission: WRITE,
  handler: async (input, actor) => {
    await receivableService.deleteReceipt(actor, input.receiptId);
    return DONE;
  },
});

export const adjustReceivable = writeAction({
  schema: adjustReceivableSchema,
  permission: WRITE,
  handler: async (input, actor) => {
    await receivableService.adjustReceivable(actor, input);
    return DONE;
  },
});

export const moveExpectedDate = writeAction({
  schema: moveExpectedDateSchema,
  permission: WRITE,
  handler: async (input, actor) => {
    await receivableService.moveExpectedDate(actor, input.revenueEntryId, input.expectedDate);
    return DONE;
  },
});

export const createStandaloneReceivable = writeAction({
  schema: standaloneReceivableSchema,
  permission: WRITE,
  handler: async (input, actor) => {
    await receivableService.createStandaloneReceivable(actor, input);
    return DONE;
  },
});
