import type { ColumnSchema, DbAdapter, Filter } from "@azmr/db";
import { DbAdapterError } from "@azmr/db";
import { assertSafeIdentifier, createAuditLogger } from "@azmr/security";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toDbAdapterError } from "./errors.js";
import { applyFilter } from "./filter.js";

/**
 * Validates every filter column before any client call is made, so a bad
 * column fails fast (matching SQLiteAdapter's identifier-guard convention)
 * instead of only surfacing once applyFilter reaches that condition.
 */
function assertSafeFilter(filter: Filter): void {
  for (const { column } of filter) assertSafeIdentifier(column, "column name");
}

/**
 * DbAdapter implementation backed by Supabase's PostgREST query builder.
 *
 * Takes an already-constructed SupabaseClient rather than a URL/key pair —
 * this package never builds its own client, so callers keep full control of
 * auth/session/cookie wiring (e.g. @supabase/ssr's browser vs. server client
 * constructors) and RLS is enforced automatically from whatever JWT that
 * client carries.
 */
export class SupabaseAdapter implements DbAdapter {
  private readonly audit = createAuditLogger("db-supabase");

  constructor(private readonly client: SupabaseClient) {}

  async createTable(name: string, _schema: ColumnSchema): Promise<void> {
    assertSafeIdentifier(name, "table name");
    throw new DbAdapterError(
      `[azmara/db-supabase] createTable("${name}") is not supported — PostgREST cannot execute DDL. ` +
        "Create/manage this table via the Supabase SQL editor, CLI migrations, or dashboard.",
    );
  }

  async insert<T extends Record<string, unknown>>(name: string, row: T): Promise<void> {
    assertSafeIdentifier(name, "table name");
    for (const key of Object.keys(row)) assertSafeIdentifier(key, "column name");

    const { error } = await this.client.from(name).insert(row);
    if (error) throw toDbAdapterError("insert", name, error);
    this.audit.log("insert", { table: name, rowCount: 1 });
  }

  async insertMany<T extends Record<string, unknown>>(name: string, rows: T[]): Promise<void> {
    assertSafeIdentifier(name, "table name");
    if (rows.length === 0) return;

    // biome-ignore lint/style/noNonNullAssertion: rows.length === 0 checked above
    for (const key of Object.keys(rows[0]!)) assertSafeIdentifier(key, "column name");

    // Cast past supabase-js's RejectExcessProperties insert generics — this
    // package deliberately has no generated Database schema (see README:
    // "bring-your-own-schema"), so there's no schema-derived row type for
    // TypeScript to check T's shape against here.
    // biome-ignore lint/suspicious/noExplicitAny: see comment above
    const { error } = await this.client.from(name).insert(rows as any);
    if (error) throw toDbAdapterError("insertMany", name, error);
    this.audit.log("insertMany", { table: name, rowCount: rows.length });
  }

  async getAll<T = unknown>(name: string): Promise<T[]> {
    assertSafeIdentifier(name, "table name");
    const { data, error } = await this.client.from(name).select("*");
    if (error) throw toDbAdapterError("getAll", name, error);
    return (data ?? []) as T[];
  }

  async findWhere<T = unknown>(name: string, filter: Filter): Promise<T[]> {
    assertSafeIdentifier(name, "table name");
    assertSafeFilter(filter);
    const query = applyFilter(this.client.from(name).select("*"), filter);
    const { data, error } = await query;
    if (error) throw toDbAdapterError("findWhere", name, error);
    return (data ?? []) as T[];
  }

  async truncateTable(name: string): Promise<void> {
    assertSafeIdentifier(name, "table name");
    const { error } = await this.client.from(name).delete({ count: "exact" });
    if (error) throw toDbAdapterError("truncateTable", name, error);
    this.audit.log("truncateTable", { table: name });
  }

  async deleteWhere(name: string, filter: Filter): Promise<number> {
    assertSafeIdentifier(name, "table name");
    assertSafeFilter(filter);
    const query = applyFilter(this.client.from(name).delete({ count: "exact" }), filter);
    const { error, count } = await query;
    if (error) throw toDbAdapterError("deleteWhere", name, error);
    this.audit.log("deleteWhere", { table: name, changes: count ?? 0 });
    return count ?? 0;
  }

  async close(): Promise<void> {
    // No-op: supabase-js is a thin HTTP client over PostgREST — no
    // persistent connection/pool to release. Present for DbAdapter
    // interface parity so generic caller code (e.g. `finally { await
    // db.close() }`) works unmodified across both adapters.
  }
}
