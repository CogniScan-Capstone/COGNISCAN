"use client";

/**
 * Simple in-memory API cache with stale-while-revalidate pattern.
 *
 * - Returns cached data instantly on navigation back to a page
 * - Refreshes data in the background automatically
 * - Configurable TTL (time-to-live) per cache key
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const store = new Map<string, CacheEntry<unknown>>();

/** Default: data is considered "fresh" for 30 seconds */
const DEFAULT_TTL_MS = 30_000;

export function getCached<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  return entry.data;
}

export function setCached<T>(key: string, data: T): void {
  store.set(key, { data, timestamp: Date.now() });
}

export function isFresh(key: string, ttlMs: number = DEFAULT_TTL_MS): boolean {
  const entry = store.get(key);
  if (!entry) return false;
  return Date.now() - entry.timestamp < ttlMs;
}

export function clearCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(keyPrefix)) {
      store.delete(key);
    }
  }
}
