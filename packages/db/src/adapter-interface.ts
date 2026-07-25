export type ColumnType = "string" | "number" | "boolean";
export type ColumnSchema = Record<string, ColumnType>;

/** Operators common to both a SQL WHERE clause and PostgREST's filter chain. */
export type FilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "like"
  | "ilike"
  | "is"
  | "in";

export interface FilterCondition {
  column: string;
  operator: FilterOperator;
  /**
   * - "in"          -> array of values (empty array means zero rows, matching PostgREST's `.in(col, [])`)
   * - "is"          -> null | boolean only (PostgREST's IS operator is restricted to these)
   * - "like"/"ilike" -> string pattern, %/_ wildcards (SQL LIKE convention)
   * - all others    -> scalar
   */
  value: unknown;
}

/** Conditions are implicitly AND-combined. No OR support in v1. */
export type Filter = FilterCondition[];

/** Error thrown by DbAdapter implementations when an operation fails. */
export class DbAdapterError extends Error {
  readonly code?: string;
  readonly details?: string;
  readonly hint?: string;
  override readonly cause?: unknown;

  constructor(
    message: string,
    opts?: { code?: string; details?: string; hint?: string; cause?: unknown },
  ) {
    super(message);
    this.name = "DbAdapterError";
    this.code = opts?.code;
    this.details = opts?.details;
    this.hint = opts?.hint;
    this.cause = opts?.cause;
  }
}

/**
 * Storage-agnostic async persistence interface.
 *
 * Implementations: SQLiteAdapter (@azmr/db), SupabaseAdapter (@azmr/db-supabase).
 *
 * Deliberately excludes `rawSelect` (arbitrary SQL - a SQLite-only escape
 * hatch, not implementable against PostgREST) and the `path` getter
 * (SQLite-only, file-path-specific). Callers who need those must depend on
 * the concrete SQLiteAdapter class, not this interface.
 */
export interface DbAdapter {
  createTable(name: string, schema: ColumnSchema): Promise<void>;
  insert<T extends Record<string, unknown>>(name: string, row: T): Promise<void>;
  insertMany<T extends Record<string, unknown>>(name: string, rows: T[]): Promise<void>;
  getAll<T = unknown>(name: string): Promise<T[]>;
  findWhere<T = unknown>(name: string, filter: Filter): Promise<T[]>;
  truncateTable(name: string): Promise<void>;
  deleteWhere(name: string, filter: Filter): Promise<number>;
  /** Release any held resources. No-op for adapters without a persistent connection (e.g. Supabase). */
  close(): Promise<void>;
}
