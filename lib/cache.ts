/**
 * TTL cache for search results, backed by globalThis.
 *
 * Next.js bundles each route handler separately, so plain module-level state
 * is NOT shared between /api/search and /api/results. Attaching the store to
 * globalThis (the same pattern as the Prisma singleton) makes it process-wide.
 *
 * The interface matches what a Redis client exposes (get/set with expiry), so
 * swapping in ioredis later is a drop-in change. Default TTL is 20 minutes
 * per the roadmap (prices move fast).
 */

const DEFAULT_TTL_SECONDS = 20 * 60;

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const g = globalThis as unknown as {
  __flightCache?: Map<string, Entry<unknown>>;
};

const store: Map<string, Entry<unknown>> = (g.__flightCache ??= new Map());

export function cacheKeyFor(parts: (string | number | undefined | null)[]): string {
  return parts
    .map((p) => (p === undefined || p === null ? "-" : String(p).toLowerCase()))
    .join(":");
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const entry = store.get(key) as Entry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<void> {
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  // Opportunistic cleanup so the map doesn't grow forever.
  if (store.size > 500) {
    const now = Date.now();
    for (const [k, v] of store) {
      if (now > v.expiresAt) store.delete(k);
    }
  }
}

export function cacheTtlSeconds(): number {
  return DEFAULT_TTL_SECONDS;
}

/**
 * Find a cached SearchResponse by its searchId. Used by /results and
 * /api/results to re-read a search the user already ran.
 *
 * Memory first (fast, hot path); falls back to the durable Postgres store
 * when DATABASE_URL is configured, so results survive process restarts and
 * work across serverless invocations.
 */
export async function findCachedSearchById(
  searchId: string
): Promise<import("./types").SearchResponse | null> {
  for (const [, entry] of store) {
    if (Date.now() > entry.expiresAt) continue;
    const v = entry.value as { meta?: { searchId?: string } };
    if (v?.meta?.searchId === searchId) {
      return entry.value as import("./types").SearchResponse;
    }
  }

  // Memory miss → durable store (no-op fallback when DATABASE_URL is unset).
  const { getSearchResponseById } = await import("./store");
  return getSearchResponseById(searchId);
}
