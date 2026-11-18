'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { DATA_VERSION_POLL_MS, fetchDataVersion, hasNewData } from '@/lib/data-version';

/**
 * Keeps the open page current without reloading it: while the tab is visible, and whenever
 * it regains focus, it asks whether the books changed and re-renders the page from the
 * server cache only when they did.
 */
export function useDataVersion(): void {
  const router = useRouter();
  const seen = useRef<string | null>(null);

  useEffect(() => {
    async function check() {
      if (document.visibilityState !== 'visible') return;
      const version = await fetchDataVersion();
      if (version === null) return;
      const changed = hasNewData(seen.current, version);
      seen.current = version;
      if (changed) router.refresh();
    }

    void check();
    const timer = window.setInterval(check, DATA_VERSION_POLL_MS);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, [router]);
}
