export interface RateLimitOptions {
  /** Maximum number of requests allowed per window. */
  maxRequests: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;

// Store-per-limiter, kept out of the returned object so the public shape
// stays { check, reset, resetAll } — _debugStoreSize (test-only, not
// exported from index.ts) looks it up by limiter identity.
const storesOf = new WeakMap<RateLimiter, Map<string, number[]>>();

/**
 * In-memory sliding-window rate limiter.
 *
 * Each key (e.g. IP address, user ID) is tracked independently. Timestamps
 * outside the current window are pruned whenever that key is checked, and
 * the map entry itself is deleted once no fresh timestamps remain for a key
 * that stops being checked entirely — swept opportunistically (no timer, so
 * this stays safe to import into a browser bundle): any `check()` call
 * triggers a full sweep if at least `windowMs` has passed since the last
 * one, dropping every key whose newest timestamp has aged out. Memory is
 * bounded to keys checked within roughly the last `windowMs`, not every key
 * ever seen.
 *
 * Not suitable for multi-process/distributed use — use Redis-backed
 * limiting (e.g. @upstash/ratelimit) when horizontal scaling is needed.
 */
export function createRateLimiter(options: RateLimitOptions) {
  const { maxRequests, windowMs } = options;
  const store = new Map<string, number[]>();
  let lastSweep = Date.now();

  function sweep(now: number): void {
    const windowStart = now - windowMs;
    for (const [key, timestamps] of store) {
      const fresh = timestamps.filter((t) => t > windowStart);
      if (fresh.length === 0) store.delete(key);
      else if (fresh.length !== timestamps.length) store.set(key, fresh);
    }
    lastSweep = now;
  }

  const limiter = {
    check(key: string): RateLimitResult {
      const now = Date.now();
      const windowStart = now - windowMs;

      if (now - lastSweep >= windowMs) sweep(now);

      const timestamps = (store.get(key) ?? []).filter((t) => t > windowStart);

      if (timestamps.length >= maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          // biome-ignore lint/style/noNonNullAssertion: timestamps.length >= maxRequests > 0
          resetAt: new Date(timestamps[0]! + windowMs),
        };
      }

      timestamps.push(now);
      store.set(key, timestamps);

      return {
        allowed: true,
        remaining: maxRequests - timestamps.length,
        resetAt: new Date(now + windowMs),
      };
    },

    reset(key: string): void {
      store.delete(key);
    },

    resetAll(): void {
      store.clear();
      lastSweep = Date.now();
    },
  };

  storesOf.set(limiter, store);
  return limiter;
}

/** @internal Test-only accessor for the number of keys currently tracked. Not exported from index.ts — not part of the public API. */
export function _debugStoreSize(limiter: RateLimiter): number {
  return storesOf.get(limiter)?.size ?? 0;
}
