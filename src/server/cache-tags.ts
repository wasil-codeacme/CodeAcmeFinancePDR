/**
 * Server cache tags for reference data that changes rarely (settings and the client list).
 * Money figures — revenue, receipts, expenses, the P&L — are never cached; they are read live.
 */
export const CACHE_TAG = {
  SETTINGS: 'settings',
  CLIENTS: 'clients',
} as const;
export type CacheTag = (typeof CACHE_TAG)[keyof typeof CACHE_TAG];

/** Bounds staleness on other server instances, which a tag update on this one does not reach. */
export const REFERENCE_CACHE_LIFE = 'minutes';
