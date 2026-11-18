'use client';

import { useDataVersion } from '@/hooks/use-data-version';

/** Renders nothing; refreshes the page when someone else changes the books. */
export function DataVersionWatcher() {
  useDataVersion();
  return null;
}
