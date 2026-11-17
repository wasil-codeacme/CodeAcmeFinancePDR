import { AsyncLocalStorage } from 'node:async_hooks';

import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';

type DbClient = Prisma.TransactionClient;

// Lets services group repository calls (e.g. a write plus its audit entry) into one
// transaction without threading a transaction client through every function signature.
const transactionStorage = new AsyncLocalStorage<DbClient>();

/** The active transaction client, or the shared client outside a transaction. */
export function db(): DbClient {
  return transactionStorage.getStore() ?? prisma;
}

export async function runInTransaction<TResult>(work: () => Promise<TResult>): Promise<TResult> {
  if (transactionStorage.getStore()) return work();
  return prisma.$transaction((transaction) => transactionStorage.run(transaction, work));
}
