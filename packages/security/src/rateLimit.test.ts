import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _debugStoreSize, createRateLimiter } from "./rateLimit.js";

describe("createRateLimiter", () => {
  it("allows requests within the limit", () => {
    const limiter = createRateLimiter({ maxRequests: 3, windowMs: 1000 });
    const r1 = limiter.check("user-1");
    const r2 = limiter.check("user-1");
    const r3 = limiter.check("user-1");
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("blocks requests over the limit", () => {
    const limiter = createRateLimiter({ maxRequests: 2, windowMs: 1000 });
    limiter.check("user-1");
    limiter.check("user-1");
    const r = limiter.check("user-1");
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
  });

  it("tracks keys independently", () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 1000 });
    const r1 = limiter.check("user-1");
    const r2 = limiter.check("user-2");
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
  });

  it("resets a specific key", () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 1000 });
    limiter.check("user-1");
    limiter.reset("user-1");
    const r = limiter.check("user-1");
    expect(r.allowed).toBe(true);
  });

  it("resets all keys", () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 1000 });
    limiter.check("user-1");
    limiter.check("user-2");
    limiter.resetAll();
    expect(limiter.check("user-1").allowed).toBe(true);
    expect(limiter.check("user-2").allowed).toBe(true);
  });

  it("provides a resetAt date", () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 5000 });
    limiter.check("user-1");
    const r = limiter.check("user-1");
    expect(r.resetAt).toBeInstanceOf(Date);
    expect(r.resetAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("createRateLimiter — stale-key eviction", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not delete a key's entry while it is still being actively checked", () => {
    const limiter = createRateLimiter({ maxRequests: 5, windowMs: 1000 });
    limiter.check("user-1");
    expect(_debugStoreSize(limiter)).toBe(1);
  });

  it("evicts a key's entry once its timestamps age out, without any further checks on that key", () => {
    const limiter = createRateLimiter({ maxRequests: 5, windowMs: 1000 });
    limiter.check("user-1");
    limiter.check("user-2");
    expect(_debugStoreSize(limiter)).toBe(2);

    // Advance past the window, then past the sweep threshold — a check on a
    // *different, unrelated* key is enough to trigger the opportunistic
    // sweep; neither user-1 nor user-2 is touched again.
    vi.advanceTimersByTime(2000);
    limiter.check("user-3");

    expect(_debugStoreSize(limiter)).toBe(1); // only user-3 remains
  });

  it("bounds memory to keys checked within roughly the last windowMs, not every key ever seen", () => {
    const limiter = createRateLimiter({ maxRequests: 5, windowMs: 1000 });
    for (let i = 0; i < 50; i++) {
      limiter.check(`user-${i}`);
      vi.advanceTimersByTime(50); // 50 * 50ms = 2500ms total, well past windowMs
    }
    // By the time the loop ends, keys checked more than ~1000ms ago should
    // have been swept out along the way — the store never held all 50 at once.
    expect(_debugStoreSize(limiter)).toBeLessThan(50);
  });

  it("resetAll() also resets the sweep clock", () => {
    const limiter = createRateLimiter({ maxRequests: 5, windowMs: 1000 });
    limiter.check("user-1");
    limiter.resetAll();
    expect(_debugStoreSize(limiter)).toBe(0);
  });
});
