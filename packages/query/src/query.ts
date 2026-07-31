import type { Signal } from "@azmr/core";

type Predicate<T> = (item: T) => boolean;
type Comparator<T> = (a: T, b: T) => number;

/**
 * Chainable, data-first query builder over an array or reactive Signal.
 * Predicates are always TypeScript functions — no string eval, no injection risk.
 *
 * Usage:
 *   const results = query(customers)
 *     .where(c => c.balance > 0)
 *     .orderBy((a, b) => a.name.localeCompare(b.name))
 *     .limit(10)
 *     .select();
 */
export class QueryBuilder<T> {
  private readonly _source: T[] | Signal<T[]>;
  private readonly _predicates: Predicate<T>[] = [];
  private _comparator: Comparator<T> | null = null;
  private _limitN: number | null = null;
  private _offsetN = 0;

  constructor(source: T[] | Signal<T[]>) {
    this._source = source;
  }

  where(predicate: Predicate<T>): this {
    if (typeof predicate !== "function") {
      throw new TypeError("[azmara/query] .where() requires a function predicate");
    }
    this._predicates.push(predicate);
    return this;
  }

  orderBy(comparator: Comparator<T>): this {
    if (typeof comparator !== "function") {
      throw new TypeError("[azmara/query] .orderBy() requires a comparator function");
    }
    this._comparator = comparator;
    return this;
  }

  limit(n: number): this {
    if (!Number.isInteger(n) || n < 0) {
      throw new RangeError("[azmara/query] .limit() must be a non-negative integer");
    }
    this._limitN = n;
    return this;
  }

  offset(n: number): this {
    if (!Number.isInteger(n) || n < 0) {
      throw new RangeError("[azmara/query] .offset() must be a non-negative integer");
    }
    this._offsetN = n;
    return this;
  }

  select(): T[] {
    return this.buildResult(this._limitN);
  }

  count(): number {
    return this.select().length;
  }

  /** Reads at most one row without permanently limiting this builder — unlike `.limit(1).select()`, does not mutate state, so a later `.select()` on the same instance still returns the full result set. */
  first(): T | undefined {
    return this.buildResult(1)[0];
  }

  /** Shared by select() and first() — takes limit as a parameter instead of reading `this._limitN` directly, so first() can request one row without setting builder state. */
  private buildResult(limit: number | null): T[] {
    // Resolve source — works with plain arrays and reactive Signals
    const raw = isSignal<T[]>(this._source) ? this._source.get() : this._source;

    let result = [...raw]; // never mutate source

    for (const predicate of this._predicates) {
      result = result.filter(predicate);
    }

    if (this._comparator !== null) {
      result.sort(this._comparator);
    }

    if (this._offsetN > 0) {
      result = result.slice(this._offsetN);
    }

    if (limit !== null) {
      result = result.slice(0, limit);
    }

    return result;
  }
}

function isSignal<T>(value: unknown): value is Signal<T> {
  return (
    typeof value === "object" && value !== null && typeof (value as Signal<T>).get === "function"
  );
}

export function query<T>(source: T[] | Signal<T[]>): QueryBuilder<T> {
  return new QueryBuilder(source);
}
