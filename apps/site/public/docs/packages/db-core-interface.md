# @azmr/db-core-interface

> The DbAdapter contract shared by @azmr/db and @azmr/db-supabase — types and DbAdapterError, with no dependencies.

Source: https://platform.azmara.io/docs/packages/db-core-interface

`@azmr/db-core-interface` is the storage-agnostic persistence contract: the `DbAdapter` interface, its filter and schema types, and the `DbAdapterError` class. It has no dependencies, so it can be installed on its own, in any runtime, without `better-sqlite3` or Supabase.

Both adapters implement it:

| Package             | Backend                                  |
| ------------------- | ---------------------------------------- |
| `@azmr/db`          | Local SQLite (`SQLiteAdapter`)           |
| `@azmr/db-supabase` | Supabase / PostgREST (`SupabaseAdapter`) |

## Installation

```bash
pnpm add @azmr/db-core-interface
```

You normally do not install it directly: `@azmr/db` and `@azmr/db-supabase` depend on it. Install it yourself when you write against `DbAdapter` without choosing a backend, or when you build a new adapter (Postgres, D1, in-memory).

## The `DbAdapter` interface

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

Deliberately left out: `rawSelect` (arbitrary SQL, a SQLite-only escape hatch that PostgREST cannot implement) and the `path` getter. Code that needs those depends on `SQLiteAdapter` directly.

## Filters

Conditions are implicitly AND-combined. There is no OR support yet.

| Prop       | Type             | Default | Required | Description                                                                                                                                                                                                                                                                     |
| ---------- | ---------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `column`   | `string`         |         | Yes      |                                                                                                                                                                                                                                                                                 |
| `operator` | `FilterOperator` |         | Yes      |                                                                                                                                                                                                                                                                                 |
| `value`    | `unknown`        |         | Yes      | - "in" -> array of values (empty array means zero rows, matching PostgREST's \`.in(col, \[])\`) - "is" -> null \| boolean only (PostgREST's IS operator is restricted to these) - "like"/"ilike" -> string pattern, %/\_ wildcards (SQL LIKE convention) - all others -> scalar |

## Errors

Adapters throw `DbAdapterError` when an operation fails. It carries the optional `code`, `details`, `hint` and `cause` the backend reported.

```typescript
import { DbAdapterError } from "@azmr/db-core-interface";

try {
  await db.insert("customers", { id: 1 });
} catch (error) {
  if (error instanceof DbAdapterError) {
    console.error(error.code, error.hint);
  }
}
```

> **Note**
>
> `DbAdapterError` is a class, so `instanceof` only works if your app ends up with one copy of this
> package. `@azmr/db` and `@azmr/db-supabase` re-use the same class, and `@azmr/db/interface`
> re-exports it, so mixing those imports is safe. If a lock file ever holds two versions of
> `@azmr/db-core-interface`, deduplicate them.

## Writing against the interface

Code that takes a `DbAdapter` runs unchanged against either backend:

```typescript
import type { DbAdapter, Filter } from "@azmr/db-core-interface";

const active: Filter = [{ column: "active", operator: "eq", value: 1 }];

export async function countActive(db: DbAdapter, table: string): Promise<number> {
  return (await db.findWhere(table, active)).length;
}
```

When you build your own adapter, implement every `DbAdapter` method and throw `DbAdapterError` (never a backend-specific error), so callers handle failures the same way against every backend.

## Requirements

- Node.js ≥ 18
- TypeScript ≥ 5 (types included)
- ESM only
