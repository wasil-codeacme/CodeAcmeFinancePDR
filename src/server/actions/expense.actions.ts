'use server';

import { PERMISSION } from '@/lib/permissions';
import { writeAction } from '@/server/actions/action';
import * as expenseAttachmentService from '@/server/services/expense-attachment.service';
import * as expenseService from '@/server/services/expense.service';
import * as recurringTemplateService from '@/server/services/recurring-template.service';
import {
  addAttachmentSchema,
  attachmentIdSchema,
  expenseIdSchema,
  expenseMonthSchema,
  expenseSchema,
  recurringTemplateSchema,
  updateExpenseSchema,
  updateRecurringTemplateSchema,
} from '@/server/validators/expense.schema';

const WRITE = PERMISSION.ENTRIES_WRITE;
const DONE = true;

export const createExpense = writeAction({
  schema: expenseSchema,
  permission: WRITE,
  handler: async (input, actor) => (await expenseService.createExpense(actor, input)).id,
});

export const updateExpense = writeAction({
  schema: updateExpenseSchema,
  permission: WRITE,
  handler: async (input, actor) => (await expenseService.updateExpense(actor, input)).id,
});

export const deleteExpense = writeAction({
  schema: expenseIdSchema,
  permission: WRITE,
  handler: async (input, actor) => {
    await expenseService.deleteExpense(actor, input.id);
    return DONE;
  },
});

export const confirmExpense = writeAction({
  schema: expenseIdSchema,
  permission: WRITE,
  handler: async (input, actor) => (await expenseService.confirmExpense(actor, input.id)).id,
});

export const confirmAllExpenseDrafts = writeAction({
  schema: expenseMonthSchema,
  permission: WRITE,
  handler: (input, actor) => expenseService.confirmAllDrafts(actor, input.month),
});

export const generateRecurringDrafts = writeAction({
  schema: expenseMonthSchema,
  permission: WRITE,
  handler: (input, actor) => expenseService.generateRecurringDrafts(actor, input.month),
});

export const createRecurringTemplate = writeAction({
  schema: recurringTemplateSchema,
  permission: WRITE,
  handler: async (input, actor) =>
    (await recurringTemplateService.createRecurringTemplate(actor, input)).id,
});

export const updateRecurringTemplate = writeAction({
  schema: updateRecurringTemplateSchema,
  permission: WRITE,
  handler: async (input, actor) =>
    (await recurringTemplateService.updateRecurringTemplate(actor, input.id, input.template)).id,
});

export const addExpenseAttachment = writeAction({
  schema: addAttachmentSchema,
  permission: WRITE,
  handler: async (input, actor) =>
    expenseAttachmentService.addExpenseAttachment(actor, {
      expenseId: input.expenseId,
      fileName: input.file.name,
      data: new Uint8Array(await input.file.arrayBuffer()),
    }),
});

export const removeExpenseAttachment = writeAction({
  schema: attachmentIdSchema,
  permission: WRITE,
  handler: async (input, actor) => {
    await expenseAttachmentService.removeExpenseAttachment(actor, input.id);
    return DONE;
  },
});
