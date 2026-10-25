// In-memory TTL cache + counters (spec.md > Usage Guard). Per server instance, best-effort.
const store = new Map<string, { v: unknown; exp: number }>();
const counters = new Map<string, { count: number; resetAt: number }>();

export const MINUTE = 60_000;
export const DAY = 86_400_000;

export function cacheGet<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (hit.exp <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return hit.v as T;
}

export function cacheSet(key: string, v: unknown, ttlMs: number): void {
  if (store.size > 500) {
    const now = Date.now();
    for (const [k, e] of store) if (e.exp <= now) store.delete(k);
    for (const [k, c] of counters) if (c.resetAt <= now) counters.delete(k);
  }
  store.set(key, { v, exp: Date.now() + ttlMs });
}

function nextUtcMidnight(now: number): number {
  return now - (now % DAY) + DAY;
}

/**
 * Fixed-window counter. Counts one use if under `limit`.
 * window "day" resets at UTC midnight; a number is a rolling-from-first-hit window in ms.
 */
export function takeCount(
  key: string,
  limit: number,
  window: "day" | number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  if (counters.size > 500) for (const [k, v] of counters) if (v.resetAt <= now) counters.delete(k);
  let c = counters.get(key);
  if (!c || c.resetAt <= now) {
    c = { count: 0, resetAt: window === "day" ? nextUtcMidnight(now) : now + window };
    counters.set(key, c);
  }
  const retryAfter = Math.max(1, Math.ceil((c.resetAt - now) / 1000));
  if (c.count >= limit) return { ok: false, retryAfter };
  c.count += 1;
  return { ok: true, retryAfter };
}

/** Test helper: wipe all in-memory state (caches, counters, resting models). */
export function resetServerState(): void {
  store.clear();
  counters.clear();
}
