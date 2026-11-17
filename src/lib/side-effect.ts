import { logger } from '@/lib/logger';

type SideEffectContext = { effect: string } & Record<string, string | number | boolean>;

/** Runs an incidental effect so its failure is logged and never fails the caller. */
export async function runSideEffect(
  effect: () => Promise<unknown>,
  context: SideEffectContext,
): Promise<void> {
  try {
    await effect();
  } catch (error) {
    logger.error({ err: error, ...context }, 'Side effect failed');
  }
}
