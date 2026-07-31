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
          s();
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

/**
 * A reactive value container. Any effect that reads `.get()` while active
 * will automatically re-run when the value changes.
 */
export class Signal<T> {
  private _value: T;

  constructor(initialValue: T) {
    this._value = initialValue;
  }

  get(): T {
    if (currentEffect !== null) {
      trackedSubscribers(this as Signal<unknown>).add(currentEffect);
      currentDeps?.add(this as Signal<unknown>);
    }
    return this._value;
  }

  set(value: T): void {
    if (Object.is(this._value, value)) return;
    this._value = value;
    const subscribers = subscribersOf.get(this as Signal<unknown>);
    if (subscribers) {
      for (const subscriber of subscribers) {
        pendingSubscribers.add(subscriber);
      }
    }
    flushIfIdle();
  }

  peek(): T {
    return this._value;
  }

  subscribe(callback: (value: T) => void): () => void {
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
 */
export function effect(fn: () => void): () => void {
  let deps = new Set<Signal<unknown>>();
  let disposed = false;

  const run: Subscriber = () => {
    if (disposed) return;

    // Drop stale deps before each re-run so a conditional branch that stops
    // being taken (e.g. `cond.get() ? a.get() : b.get()`) doesn't keep this
    // effect subscribed to the untaken branch's signal.
    for (const signal of deps) trackedSubscribers(signal).delete(run);
    deps = new Set();

    const prevEffect = currentEffect;
    const prevDeps = currentDeps;
    currentEffect = run;
    currentDeps = deps;
    try {
      fn();
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
  };
}

/**
 * A read-only Signal whose value is derived from other Signals. The returned
 * Signal carries a non-enumerable `dispose()` that stops recomputation (and
 * detaches from every signal `fn` reads) — call it to tear down the chain.
 */
export function computed<T>(fn: () => T): Signal<T> & { dispose(): void } {
  const sig = new Signal<T>(fn());
  const dispose = effect(() => sig.set(fn()));
  return Object.defineProperty(sig, "dispose", {
    value: dispose,
    enumerable: false,
    writable: false,
    configurable: false,
  }) as Signal<T> & { dispose(): void };
}
