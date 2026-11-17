'use server';

import { PERMISSION } from '@/lib/permissions';
import { writeAction } from '@/server/actions/action';
import * as salesActivityService from '@/server/services/sales-activity.service';
import { salesActivitySchema } from '@/server/validators/sales.schema';

export const saveSalesActivity = writeAction({
  schema: salesActivitySchema,
  permission: PERMISSION.ENTRIES_WRITE,
  handler: async (input, actor) => {
    await salesActivityService.saveSalesActivity(actor, input);
    return true;
  },
});
