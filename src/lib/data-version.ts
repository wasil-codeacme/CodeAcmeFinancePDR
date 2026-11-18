import { ROUTES } from '@/lib/routes';

/** How often an open, visible tab asks whether the books changed. */
export const DATA_VERSION_POLL_MS = 30_000;

/** The first reading only sets the baseline; after that, any change means new data. */
export function hasNewData(previous: string | null, next: string): boolean {
  return previous !== null && previous !== next;
}

/** The current data version, or null when it cannot be read (offline, signed out). */
export async function fetchDataVersion(): Promise<string | null> {
  try {
    const response = await fetch(ROUTES.API.VERSION, { cache: 'no-store' });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    if (typeof body !== 'object' || body === null || !('data' in body)) return null;
    const { data } = body;
    if (typeof data !== 'object' || data === null || !('version' in data)) return null;
    return typeof data.version === 'string' ? data.version : null;
  } catch {
    // A missed check is harmless: the next one (or the next focus) tries again.
    return null;
  }
}
