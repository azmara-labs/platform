type Subscriber = () => void;

let currentEffect: Subscriber | null = null;
// The active effect run's dependency set, populated by Signal.get() as it
// reads signals during this pass. null outside an effect run.
let currentDeps: Set<Signal<unknown>> | null = null;

// Subscriber storage lives outside the Signal class (keyed by instance, via
// WeakMap) rather than as a class field, so effect()'s disposer can remove a
// subscriber from every signal it read without Signal needing to expose a
// public removal method on its instance API.
const subscribersOf = new WeakMap<Signal<unknown>, Set<Subscriber>>();

function trackedSubscribers(signal: Signal<unknown>): Set<Subscriber> {
  let subs = subscribersOf.get(signal);
  if (!subs) {
    subs = new Set();
    subscribersOf.set(signal, subs);
  }
  return subs;
}

// Monotonically increasing stamp, bumped on every real (non-equal)
// Signal.set(). A ComputedSignal's subscription to its own dependencies is
// only established the first time something reads it — so two consumers
// reading a shared upstream signal in different orders (e.g. an effect
// reading a raw signal before a computed derived from it) can end up
// subscribed to that signal in either order. Relying solely on push-based
// dirty flagging then lets a computed be read as stale before its own
// _markDirty subscriber has had a turn in the same flush. Comparing version
// stamps at _sync() time re-derives freshness directly, independent of
// subscriber-notification order.
let globalVersion = 0;
const versionOf = new WeakMap<Signal<unknown>, number>();

// ── Scheduler ────────────────────────────────────────────────────────────────
// Deduplicates effects so a single set() call never triggers the same effect
// more than once per flush cycle, even when a computed chain causes the same
// effect to be re-queued mid-flush.
//
// Key design: Signal.set() adds ALL its subscribers to pendingSubscribers
// before calling flushIfIdle(), so the entire sibling set is batched together.
// Only then does the flush start. If a nested set() fires during the flush,
// flushIfIdle() is a no-op and new subscribers join the next while-loop pass.
// The generation counter prevents an effect that already ran this cycle from
// running again even if it is re-queued by a downstream signal.
let isFlushing = false;
let flushGeneration = 0;
let batchDepth = 0;
const pendingSubscribers = new Set<Subscriber>();
const subscriberGeneration = new WeakMap<Subscriber, number>();

type ErrorHandler = (error: unknown) => void;

// No handler registered by default — rethrown asynchronously (via a resolved
// Promise, since queueMicrotask isn't in this package's ES2022 lib target)
// so a subscriber error is never silently swallowed, without blocking the
// flush that surfaced it (see the default branch in flushIfIdle below).
let errorHandler: ErrorHandler | null = null;

/**
 * Registers a handler for errors thrown by a subscriber (an `effect()` re-run
 * or a `subscribe()` callback) during a flush. Without this, one bad
 * subscriber's exception would propagate out of an unrelated caller's
 * `set()` and abort every other subscriber still pending in that flush — with
 * a handler registered, the error is routed here instead and the flush
 * continues. Returns a function that restores whichever handler was active
 * before this call.
 *
 * Does not catch errors thrown by `effect(fn)`'s first, synchronous run, or
 * by any direct call to `fn()` (e.g. inside `batch()`/`untrack()`) — those
 * still throw normally to the caller, who is right there to catch them. Only
 * re-runs driven by the flush scheduler are affected.
 *
 * If `handler` itself throws, that error is rethrown asynchronously instead
 * of propagating out of the flush — a broken handler can't reintroduce the
 * bug this function exists to fix.
 */
export function onError(handler: ErrorHandler): () => void {
  const prev = errorHandler;
  errorHandler = handler;
  return () => {
    errorHandler = prev;
  };
}

// A throwing errorHandler must not itself take down the flush — that would
// reintroduce the exact bug onError() exists to fix, just relocated from the
// subscriber to the handler. Falls back to the same async-rethrow path used
// when no handler is registered at all.
function reportError(error: unknown): void {
  try {
    if (errorHandler) {
      errorHandler(error);
      return;
    }
  } catch (handlerError) {
    error = handlerError;
  }
  Promise.resolve().then(() => {
    throw error;
  });
}

function flushIfIdle(): void {
  if (isFlushing || batchDepth > 0) return;
  isFlushing = true;
  flushGeneration++;
  const gen = flushGeneration;
  try {
    while (pendingSubscribers.size > 0) {
      const snapshot = [...pendingSubscribers];
      pendingSubscribers.clear();
      for (const s of snapshot) {
        if (subscriberGeneration.get(s) !== gen) {
          subscriberGeneration.set(s, gen);
          try {
            s();
          } catch (error) {
            reportError(error);
          }
        }
      }
    }
  } finally {
    isFlushing = false;
  }
}

/**
 * Coalesces every `set()` call made inside `fn` into a single flush, so
 * effects that read multiple signals written during `fn` run once after
 * `fn` returns, instead of once per `set()` call. Values update
 * synchronously as usual — `.get()`/`.peek()` inside `fn` always see the
 * latest write; only the effect flush is deferred. Nests correctly: an
 * inner `batch()` completing does not trigger a flush while an outer one
 * is still open.
 */
export function batch<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) flushIfIdle();
  }
}

/**
 * Runs `fn` with dependency tracking suspended, so any `.get()` calls made
 * inside it — including ones buried in code `fn` calls into, not just a
 * direct call at the top level — do not register a dependency on the
 * currently-running effect. Unlike `.peek()`, which only works where you
 * control the call site, `untrack()` composes: it works even when `fn`
 * calls third-party or generic code you can't rewrite to use `.peek()`
 * internally. A no-op outside an effect. An effect created inside `fn`
 * still tracks its own reads normally — the suspension only applies to the
 * effect that was active when `untrack()` was called.
 */
export function untrack<T>(fn: () => T): T {
  const prevEffect = currentEffect;
  const prevDeps = currentDeps;
  currentEffect = null;
  currentDeps = null;
  try {
    return fn();
  } finally {
    currentEffect = prevEffect;
    currentDeps = prevDeps;
  }
}

export interface SignalOptions<T> {
  /**
   * Replaces the default `Object.is` check `set()` uses to decide whether a
   * write is a no-op. Useful for object/array values you want compared by
   * shape rather than by reference — e.g. a deep-equal or shallow-equal
   * function — so setting a value that's structurally the same as the
   * current one doesn't notify subscribers or trigger a re-render.
   */
  equals?: (a: T, b: T) => boolean;
}

/**
 * A reactive value container. Any effect that reads `.get()` while active
 * will automatically re-run when the value changes.
 */
export class Signal<T> {
  private _value: T;
  // Typed (a: unknown, b: unknown) => boolean rather than (a: T, b: T) =>
  // boolean — a field using T in parameter (contravariant) position would
  // make Signal<T> invariant in T, breaking every `signal as Signal<unknown>`
  // cast this module relies on elsewhere (subscribersOf, currentDeps, etc).
  private readonly _equals: (a: unknown, b: unknown) => boolean;

  constructor(initialValue: T, options?: SignalOptions<T>) {
    this._value = initialValue;
    this._equals = options?.equals
      ? (options.equals as (a: unknown, b: unknown) => boolean)
      : Object.is;
  }

  /**
   * Overridden by `computed()`'s internal Signal subclass to lazily bring
   * `_value` up to date immediately before a read. No-op on a plain Signal.
   */
  protected _sync(): void {}

  get(): T {
    this._sync();
    if (currentEffect !== null) {
      trackedSubscribers(this as Signal<unknown>).add(currentEffect);
      currentDeps?.add(this as Signal<unknown>);
    }
    return this._value;
  }

  set(value: T): void {
    if (this._equals(this._value, value)) return;
    this._value = value;
    versionOf.set(this as Signal<unknown>, ++globalVersion);
    const subscribers = subscribersOf.get(this as Signal<unknown>);
    if (subscribers) {
      for (const subscriber of subscribers) {
        pendingSubscribers.add(subscriber);
      }
    }
    flushIfIdle();
  }

  peek(): T {
    this._sync();
    return this._value;
  }

  subscribe(callback: (value: T) => void): () => void {
    this._sync();
    const sub: Subscriber = () => callback(this._value);
    const subs = trackedSubscribers(this as Signal<unknown>);
    subs.add(sub);
    return () => subs.delete(sub);
  }
}

/** @internal Test-only accessor for the current subscriber count of a signal. Not exported from index.ts — not part of the public API. */
export function _debugSubscriberCount(signal: Signal<unknown>): number {
  return subscribersOf.get(signal)?.size ?? 0;
}

/**
 * Run `fn` immediately and re-run whenever any Signal read inside it changes.
 * Returns a disposer that detaches this effect from every signal it read, so
 * it stops re-running and can be garbage collected. Safe to call more than
 * once, and safe to call from inside another effect during the same flush —
 * a disposed effect's `run` is a no-op even if already queued.
 *
 * `fn` may return a cleanup function. It runs right before the next re-run
 * (after deps are dropped, before `fn` runs again) and on dispose — mirrors
 * React's `useEffect` cleanup semantics.
 */
export function effect(fn: () => unknown): () => void {
  let deps = new Set<Signal<unknown>>();
  let disposed = false;
  let cleanup: (() => void) | undefined;

  const runCleanup = () => {
    if (cleanup) {
      const run = cleanup;
      cleanup = undefined;
      run();
    }
  };

  const run: Subscriber = () => {
    if (disposed) return;

    // Drop stale deps before each re-run so a conditional branch that stops
    // being taken (e.g. `cond.get() ? a.get() : b.get()`) doesn't keep this
    // effect subscribed to the untaken branch's signal.
    for (const signal of deps) trackedSubscribers(signal).delete(run);
    deps = new Set();

    runCleanup();

    const prevEffect = currentEffect;
    const prevDeps = currentDeps;
    currentEffect = run;
    currentDeps = deps;
    try {
      const result = fn();
      cleanup = typeof result === "function" ? (result as () => void) : undefined;
    } finally {
      currentEffect = prevEffect;
      currentDeps = prevDeps;
    }
  };

  run();

  return () => {
    if (disposed) return;
    disposed = true;
    for (const signal of deps) trackedSubscribers(signal).delete(run);
    deps = new Set();
    runCleanup();
  };
}

// computed()'s implementation: lazy and pull-based. Nothing runs at
// creation — _dirty starts true, so the deferred first computation happens
// on whichever `get()`/`peek()` reads it first. While unobserved (nobody
// reading it from an active effect/computed/subscribe()), an upstream
// change from _markDirty only flags staleness; it does NOT recompute, so an
// upstream signal that changes N times without ever being read costs
// nothing beyond the flag. Once observed, _markDirty switches to
// recomputing eagerly on every upstream change instead — same as the old
// eager computed — so set()'s equals check still suppresses notifying this
// computed's own subscribers when the recomputed value is unchanged.
class ComputedSignal<T> extends Signal<T> {
  private _dirty = true;
  private _disposed = false;
  // Distinguishes "never computed yet" from "computed at least once, now
  // stale" — dispose() alone doesn't clear _dirty (an unobserved upstream
  // change before dispose() leaves it stale), so _sync() needs this to know
  // whether a post-dispose read is the one deliberate deferred-first-read
  // catch-up (see _recompute below) or a case that must stay frozen instead.
  private _everComputed = false;
  private _deps = new Set<Signal<unknown>>();
  // Version stamps of each dependency as of the last successful recompute —
  // see versionOf's comment above for why push-based _dirty flagging alone
  // isn't sufficient to detect staleness.
  private _depVersions = new Map<Signal<unknown>, number>();
  private readonly _fn: () => T;

  constructor(fn: () => T) {
    // Placeholder — _dirty starts true, so _sync() always computes a real
    // value before this is ever observed by a caller.
    super(undefined as T);
    this._fn = fn;
  }

  private _isObserved(): boolean {
    const subscribers = subscribersOf.get(this as Signal<unknown>);
    return !!subscribers && subscribers.size > 0;
  }

  private _markDirty: Subscriber = () => {
    if (this._disposed) return;
    if (!this._isObserved()) {
      this._dirty = true;
      return;
    }
    // Another subscriber may have already pulled this computed fresh —
    // via _sync()'s staleness check, reading it before this push
    // notification got its turn (e.g. a diamond where a sibling computed
    // depends on both the changed signal and this computed), or via a
    // direct read made mid-batch (batch()'s own docs guarantee get()/peek()
    // inside it see the latest write immediately, ahead of the flush this
    // push notification belongs to). Recomputing again here would be
    // redundant at best; for an `fn` that returns a new object/array each
    // call, the second result wouldn't be Object.is-equal to the first,
    // bypassing set()'s equals suppression and firing a spurious extra
    // notification for a value that didn't actually change again. Reusing
    // _isStale() here (rather than a generation counter) means this check
    // is correct regardless of *when* the earlier pull happened relative to
    // the current flush.
    if (this._everComputed && !this._isStale()) return;
    this._recompute();
  };

  private _isStale(): boolean {
    for (const [dep, version] of this._depVersions) {
      if ((versionOf.get(dep) ?? 0) !== version) return true;
    }
    return false;
  }

  protected override _sync(): void {
    // Once disposed, only the deferred first computation (never having run
    // at all yet) is still allowed through — a computed disposed after
    // already producing a real value must stay frozen at it, even if an
    // unobserved upstream change left it marked dirty beforehand.
    if (this._disposed && this._everComputed) return;
    // _dirty alone can lag behind reality: it's only set by _markDirty,
    // whose subscription is established on first read, so a consumer that
    // reads a shared upstream signal before this computed can end up
    // subscribed ahead of _markDirty in that signal's subscriber list —
    // meaning this computed could be read as "not dirty yet" even though the
    // upstream value backing it has already changed. The version check
    // catches that regardless of subscriber-notification order.
    if (!this._dirty && this._everComputed && this._isStale()) this._dirty = true;
    if (this._dirty) this._recompute();
  }

  private _recompute(): void {
    for (const signal of this._deps) trackedSubscribers(signal).delete(this._markDirty);
    this._deps = new Set();

    const prevEffect = currentEffect;
    const prevDeps = currentDeps;
    currentEffect = this._markDirty;
    currentDeps = this._deps;
    let next: T;
    try {
      next = this._fn();
    } finally {
      currentEffect = prevEffect;
      currentDeps = prevDeps;
    }
    this._dirty = false;
    this._everComputed = true;
    this._depVersions = new Map();
    for (const dep of this._deps) this._depVersions.set(dep, versionOf.get(dep) ?? 0);
    this.set(next);

    if (this._disposed) {
      // dispose() was called before this (deferred) first computation ever
      // ran — this was that one-time catch-up read. Don't leave it
      // subscribed; tear the just-established deps straight back down.
      for (const signal of this._deps) trackedSubscribers(signal).delete(this._markDirty);
      this._deps = new Set();
      this._depVersions = new Map();
    }
  }

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    for (const signal of this._deps) trackedSubscribers(signal).delete(this._markDirty);
    this._deps = new Set();
  }
}

/**
 * A read-only Signal whose value is derived from other Signals, computed
 * lazily — `fn` doesn't run at creation, and an upstream change while
 * nobody is reading this computed only marks it stale, deferring the real
 * recomputation to the next `get()`/`peek()`. Once something depends on it
 * (an effect, another computed, or `subscribe()`), it recomputes eagerly on
 * every upstream change instead, exactly like before.
 *
 * The returned Signal carries a non-enumerable `dispose()` that stops
 * recomputation (and detaches from every signal `fn` reads) — call it to
 * tear down the chain.
 */
export function computed<T>(fn: () => T): Signal<T> & { dispose(): void } {
  return new ComputedSignal(fn);
}
