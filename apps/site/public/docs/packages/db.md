# @azmr/db

> Secure, async SQLite persistence adapter built on better-sqlite3.

Source: https://platform.azmara.io/docs/packages/db

> **Cloud alternative**
>
> Need a hosted Postgres backend instead of local SQLite? `@azmr/db-supabase` implements the same
> `DbAdapter` interface via Supabase/PostgREST — swap adapters without changing calling code.

## Installation

```bash
pnpm add @azmr/db
```

## Usage

Every method is asynchronous — `SQLiteAdapter` implements the shared, storage-agnostic `DbAdapter` interface (also implemented by `@azmr/db-supabase`'s `SupabaseAdapter`).

```typescript
import { SQLiteAdapter } from "@azmr/db";

const db = new SQLiteAdapter(".azmara/db/app.db", ".azmara/db");

await db.createTable("customers", {
  name: "string",
  balance: "number",
  active: "boolean",
});

await db.insert("customers", { name: "Aroha", balance: 150, active: 1 });
await db.insertMany("customers", [
  { name: "Tane", balance: 0, active: 0 },
  { name: "Mere", balance: 320, active: 1 },
]);

const all = await db.getAll<{ name: string; balance: number }>("customers");
```

## Filtering

`findWhere` and `deleteWhere` take a structured `Filter` — an array of `{ column, operator, value }` conditions (implicitly AND-combined) — instead of raw SQL fragments. This is the same shape `@azmr/db-supabase` compiles to a PostgREST filter chain, so query code is portable between backends.

```typescript
const active = await db.findWhere("customers", [
  { column: "active", operator: "eq", value: 1 },
  { column: "balance", operator: "gt", value: 100 },
]);

const removed = await db.deleteWhere("customers", [
  { column: "active", operator: "eq", value: 0 },
]);
// removed: number of rows deleted
```

| Prop       | Type             | Default | Required | Description                                                                                                                                                                                                                                                                     |
| ---------- | ---------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `column`   | `string`         |         | Yes      |                                                                                                                                                                                                                                                                                 |
| `operator` | `FilterOperator` |         | Yes      |                                                                                                                                                                                                                                                                                 |
| `value`    | `unknown`        |         | Yes      | - "in" -> array of values (empty array means zero rows, matching PostgREST's \`.in(col, \[])\`) - "is" -> null \| boolean only (PostgREST's IS operator is restricted to these) - "like"/"ilike" -> string pattern, %/\_ wildcards (SQL LIKE convention) - all others -> scalar |

## The `DbAdapter` interface

`SQLiteAdapter` and `@azmr/db-supabase`'s `SupabaseAdapter` both implement this shared, storage-agnostic interface — code written against `DbAdapter` works unchanged against either backend.

| Prop            | Type                                                                            | Default | Required | Description                                                                                     |
| --------------- | ------------------------------------------------------------------------------- | ------- | -------- | ----------------------------------------------------------------------------------------------- |
| `createTable`   | `(name: string, schema: ColumnSchema) => Promise<void>`                         |         | Yes      |                                                                                                 |
| `insert`        | `<T extends Record<string, unknown>>(name: string, row: T) => Promise<void>`    |         | Yes      |                                                                                                 |
| `insertMany`    | `<T extends Record<string, unknown>>(name: string, rows: T[]) => Promise<void>` |         | Yes      |                                                                                                 |
| `getAll`        | `<T = unknown>(name: string) => Promise<T[]>`                                   |         | Yes      |                                                                                                 |
| `findWhere`     | `<T = unknown>(name: string, filter: Filter) => Promise<T[]>`                   |         | Yes      |                                                                                                 |
| `truncateTable` | `(name: string) => Promise<void>`                                               |         | Yes      |                                                                                                 |
| `deleteWhere`   | `(name: string, filter: Filter) => Promise<number>`                             |         | Yes      |                                                                                                 |
| `close`         | `() => Promise<void>`                                                           |         | Yes      | Release any held resources. No-op for adapters without a persistent connection (e.g. Supabase). |

### Interface-only import: `@azmr/db-core-interface`

> **Note**
>
> The `DbAdapter` contract lives in its own package, `@azmr/db-core-interface`, with no
> dependencies. `@azmr/db`'s root export includes `SQLiteAdapter`, which pulls in
> `better-sqlite3` — a native, node-gyp-built module. If you only need the
> `DbAdapter`/`DbAdapterError`/`Filter` types (for example, building a new adapter, or consuming
> `@azmr/db-supabase`), depend on `@azmr/db-core-interface` and nothing else is installed.

```typescript
import type { DbAdapter, Filter } from "@azmr/db-core-interface";
import { DbAdapterError } from "@azmr/db-core-interface";
```

`@azmr/db/interface` still works and re-exports exactly the same things (the same
`DbAdapterError` class, so `instanceof` checks hold across both imports), but it installs
`better-sqlite3` with `@azmr/db`. `@azmr/db-supabase` depends on `@azmr/db-core-interface`, not on
`@azmr/db`, for exactly this reason. See [`@azmr/db-core-interface`](https://platform.azmara.io/docs/packages/db-core-interface.md).

## Security features

> **Warning**
>
> All table and column names are validated against `[a-zA-Z_][a-zA-Z0-9_]*` before any SQL is
> executed. Unsafe identifiers throw immediately.

| Feature               | Detail                                                    |
| --------------------- | --------------------------------------------------------- |
| Parameterised queries | No string concatenation — ever                            |
| Identifier validation | Table/column names regex-validated before SQL             |
| Path containment      | `allowedBase` prevents path traversal                     |
| WAL journal mode      | Write-ahead logging for integrity and performance         |
| `secure_delete`       | Deleted data overwritten with zeros                       |
| `foreign_keys ON`     | Referential integrity enforced                            |
| Audit log             | Every mutation written to hash-chained tamper-evident log |

## API Reference

| Method                       | Description                                                               |
| ---------------------------- | ------------------------------------------------------------------------- |
| `createTable(name, schema)`  | Create table if not exists                                                |
| `insert(name, row)`          | Insert a single row (parameterised)                                       |
| `insertMany(name, rows)`     | Insert multiple rows in a transaction                                     |
| `getAll<T>(name)`            | Return all rows typed as `T[]`                                            |
| `findWhere<T>(name, filter)` | Return rows matching a structured `Filter`                                |
| `truncateTable(name)`        | Delete all rows from a table (keeps schema)                               |
| `deleteWhere(name, filter)`  | Delete rows matching a structured `Filter`, returns count deleted         |
| `close()`                    | Close the database connection                                             |
| `rawSelect(sql, params)`     | SQLite-only escape hatch — not part of the shared `DbAdapter` interface   |
| `db.path`                    | Resolved path to the database file — SQLite-only, not part of `DbAdapter` |

## Column types

| Schema type | SQLite type        |
| ----------- | ------------------ |
| `"string"`  | `TEXT NOT NULL`    |
| `"number"`  | `REAL NOT NULL`    |
| `"boolean"` | `INTEGER NOT NULL` |
