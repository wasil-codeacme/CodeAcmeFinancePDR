'use server';

import { PERMISSION } from '@/lib/permissions';
import { writeAction } from '@/server/actions/action';
import * as accountBalanceService from '@/server/services/account-balance.service';
import {
  closingBalanceSchema,
  transferIdSchema,
  transferSchema,
} from '@/server/validators/account.schema';

const BALANCES = PERMISSION.BALANCES_WRITE;
const DONE = true;

export const saveClosingBalance = writeAction({
  schema: closingBalanceSchema,
  permission: BALANCES,
  handler: async (input, actor) => {
    await accountBalanceService.saveClosingBalance(actor, input);
    return DONE;
  },
});

export const createTransfer = writeAction({
  schema: transferSchema,
  permission: BALANCES,
  handler: async (input, actor) => {
    await accountBalanceService.createTransfer(actor, input);
    return DONE;
  },
});

export const deleteTransfer = writeAction({
  schema: transferIdSchema,
  permission: BALANCES,
  handler: async (input, actor) => {
    await accountBalanceService.deleteTransfer(actor, input.id);
    return DONE;
  },
});
