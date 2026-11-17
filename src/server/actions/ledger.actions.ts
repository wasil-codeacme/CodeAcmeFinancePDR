'use server';

import { PERMISSION } from '@/lib/permissions';
import { writeAction } from '@/server/actions/action';
import * as partnerLedgerService from '@/server/services/partner-ledger.service';
import { ledgerEntryIdSchema, ledgerMovementSchema } from '@/server/validators/ledger.schema';

const LEDGER = PERMISSION.PARTNER_LEDGER_WRITE;
const DONE = true;

export const recordWithdrawal = writeAction({
  schema: ledgerMovementSchema,
  permission: LEDGER,
  handler: async (input, actor) => {
    await partnerLedgerService.recordWithdrawal(actor, input);
    return DONE;
  },
});

export const recordFunding = writeAction({
  schema: ledgerMovementSchema,
  permission: LEDGER,
  handler: async (input, actor) => {
    await partnerLedgerService.recordFunding(actor, input);
    return DONE;
  },
});

export const deleteLedgerEntry = writeAction({
  schema: ledgerEntryIdSchema,
  permission: LEDGER,
  handler: async (input, actor) => {
    await partnerLedgerService.deleteLedgerEntry(actor, input.id);
    return DONE;
  },
});
