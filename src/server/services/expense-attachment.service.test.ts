import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Role } from '@/generated/prisma/enums';
import { MESSAGES } from '@/lib/messages';
import { RuleViolationError } from '@/server/errors';
import { addExpenseAttachment } from '@/server/services/expense-attachment.service';
import type { SessionUser } from '@/types/auth';

const mocks = vi.hoisted(() => ({
  findExpense: vi.fn(),
  save: vi.fn(),
  create: vi.fn(),
}));

vi.mock('@/server/container', () => ({ fileStorage: { save: mocks.save, read: vi.fn() } }));
vi.mock('@/server/repositories/expense.repository', () => ({
  expenseRepository: { findById: mocks.findExpense },
}));
vi.mock('@/server/repositories/expense-attachment.repository', () => ({
  expenseAttachmentRepository: { create: mocks.create, findById: vi.fn(), softDelete: vi.fn() },
}));
vi.mock('@/server/repositories/audited-write', () => ({
  auditedCreate: (_actor: string, _entity: string, create: () => Promise<unknown>) => create(),
  auditedChange: vi.fn(),
}));

const ACTOR: SessionUser = {
  id: 'fm',
  email: 'fm@example.test',
  name: 'FM',
  role: Role.FINANCE_MANAGER,
};
const PDF = new Uint8Array([...'%PDF-1.7 rest'].map((character) => character.charCodeAt(0)));
const HTML = new Uint8Array([...'<html><script>'].map((character) => character.charCodeAt(0)));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findExpense.mockResolvedValue({ id: 'expense-1' });
  mocks.save.mockResolvedValue('file-key');
  mocks.create.mockImplementation(async (data: Record<string, unknown>) => ({
    id: 'attachment-1',
    ...data,
  }));
});

describe('addExpenseAttachment (PRD §5.3)', () => {
  it('stores a real PDF under the type read from its bytes, with a safe name', async () => {
    const attachment = await addExpenseAttachment(ACTOR, {
      expenseId: 'expense-1',
      fileName: '../march "receipt".pdf',
      data: PDF,
    });
    expect(mocks.save).toHaveBeenCalledWith({ data: PDF, contentType: 'application/pdf' });
    expect(attachment).toEqual({
      id: 'attachment-1',
      fileName: 'march receipt.pdf',
      contentType: 'application/pdf',
      size: PDF.byteLength,
    });
  });

  it('refuses a disguised file before storing anything', async () => {
    await expect(
      addExpenseAttachment(ACTOR, { expenseId: 'expense-1', fileName: 'invoice.pdf', data: HTML }),
    ).rejects.toEqual(new RuleViolationError(MESSAGES.EXPENSE.ATTACHMENT_TYPE));
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
