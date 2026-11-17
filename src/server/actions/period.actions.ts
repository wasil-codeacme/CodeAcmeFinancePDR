'use server';

import { PERMISSION } from '@/lib/permissions';
import { writeAction } from '@/server/actions/action';
import * as commissionService from '@/server/services/commission.service';
import * as periodService from '@/server/services/period.service';
import {
  monthSchema,
  nextMonthReserveSchema,
  reopenMonthSchema,
  reserveIdSchema,
} from '@/server/validators/period.schema';

const CLOSE = PERMISSION.PERIOD_CLOSE;
const DONE = true;

export const closeMonth = writeAction({
  schema: monthSchema,
  permission: CLOSE,
  handler: async (input, actor) => {
    await periodService.closeMonth(actor, input.month);
    return DONE;
  },
});

export const reopenMonth = writeAction({
  schema: reopenMonthSchema,
  permission: CLOSE,
  handler: async (input, actor) => {
    await periodService.reopenMonth(actor, input.month, input.reason);
    return DONE;
  },
});

export const addNextMonthReserve = writeAction({
  schema: nextMonthReserveSchema,
  permission: CLOSE,
  handler: async (input, actor) => {
    await periodService.addNextMonthReserve(actor, input);
    return DONE;
  },
});

export const deleteNextMonthReserve = writeAction({
  schema: reserveIdSchema,
  permission: CLOSE,
  handler: async (input, actor) => {
    await periodService.deleteNextMonthReserve(actor, input.id);
    return DONE;
  },
});

/** Drafting commission is book-keeping, so whoever keeps the books may do it. */
export const postBdCommission = writeAction({
  schema: monthSchema,
  permission: PERMISSION.ENTRIES_WRITE,
  handler: (input, actor) => commissionService.postBdCommission(actor, input.month),
});
