/**
 * Server cache tags. Reference data (settings, the client list) is cached per instance for
 * minutes. The books (revenue, expenses, receivables, balances, reports) are cached in the
 * shared remote cache under BOOKS, which every write expires, so a save is never followed
 * by stale figures.
 */
export const CACHE_TAG = {
  SETTINGS: 'settings',
  CLIENTS: 'clients',
  BOOKS: 'books',
} as const;
export type CacheTag = (typeof CACHE_TAG)[keyof typeof CACHE_TAG];

/** Bounds staleness on other server instances, which a tag update on this one does not reach. */
export const REFERENCE_CACHE_LIFE = 'minutes';

/**
 * Writes expire BOOKS at once; this bound only matters for changes made outside the app
 * (scripts run against the database), which are picked up within the hour.
 */
export const BOOKS_CACHE_LIFE = 'hours';

/** The data version only changes when BOOKS is expired, never on a timer. */
export const DATA_VERSION_CACHE_LIFE = 'max';
