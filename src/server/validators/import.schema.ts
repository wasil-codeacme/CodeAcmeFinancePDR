import { z } from 'zod';

import { MAX_IMPORT_FILE_BYTES, XLSX_EXTENSION } from '@/lib/constants';
import { MESSAGES } from '@/lib/messages';
import { idSchema, monthKeySchema } from '@/server/validators/common.schema';

const workbookFileSchema = z
  .instanceof(File, { message: MESSAGES.IMPORT.FILE_REQUIRED })
  .refine((file) => file.name.toLowerCase().endsWith(XLSX_EXTENSION), MESSAGES.IMPORT.FILE_REQUIRED)
  .refine((file) => file.size <= MAX_IMPORT_FILE_BYTES, MESSAGES.IMPORT.FILE_TOO_LARGE);

export const previewImportSchema = z.object({ file: workbookFileSchema });

export const runImportSchema = z.object({
  file: workbookFileSchema,
  months: z.array(monthKeySchema).min(1, MESSAGES.IMPORT.NOTHING_SELECTED),
  receivedAccountId: idSchema,
});
