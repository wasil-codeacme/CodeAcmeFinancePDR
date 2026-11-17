'use server';

import { PERMISSION } from '@/lib/permissions';
import { readAction, writeAction } from '@/server/actions/action';
import { CACHE_TAG } from '@/server/cache-tags';
import * as importService from '@/server/services/import.service';
import { previewImportSchema, runImportSchema } from '@/server/validators/import.schema';

export const previewWorkbookImport = readAction({
  schema: previewImportSchema,
  permission: PERMISSION.SETTINGS_MANAGE,
  handler: async (input) => importService.previewWorkbookImport(await input.file.arrayBuffer()),
});

export const importWorkbook = writeAction({
  schema: runImportSchema,
  permission: PERMISSION.SETTINGS_MANAGE,
  invalidates: [CACHE_TAG.CLIENTS, CACHE_TAG.SETTINGS],
  handler: async (input, actor) =>
    importService.importWorkbook(actor, await input.file.arrayBuffer(), {
      months: input.months,
      receivedAccountId: input.receivedAccountId,
    }),
});
