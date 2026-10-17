# @azmr/db-core-interface

The `DbAdapter` contract shared by [`@azmr/db`](https://github.com/azmara-labs/platform/tree/main/packages/db) (SQLite) and [`@azmr/db-supabase`](https://github.com/azmara-labs/platform/tree/main/packages/db-supabase) (Supabase/PostgREST): the interface, its filter and schema types, and the `DbAdapterError` class. No dependencies.

## Installation

```bash
pnpm add @azmr/db-core-interface
# or
npm install @azmr/db-core-interface
```

You normally don't install this directly; both adapters depend on it. Install it when you write code against `DbAdapter` without picking a backend, or when you build your own adapter.

## Usage

```typescript
import type { DbAdapter, Filter } from "@azmr/db-core-interface";
import { DbAdapterError } from "@azmr/db-core-interface";

const active: Filter = [{ column: "active", operator: "eq", value: 1 }];

export async function countActive(db: DbAdapter, table: string): Promise<number> {
  return (await db.findWhere(table, active)).length;
}
```

Exports: `DbAdapter`, `DbAdapterError`, `Filter`, `FilterCondition`, `FilterOperator`, `ColumnSchema`, `ColumnType`.

`DbAdapter` deliberately excludes `rawSelect` (arbitrary SQL, a SQLite-only escape hatch) and the `path` getter. Code that needs those depends on `SQLiteAdapter` from `@azmr/db`.

## One copy only

`DbAdapterError` is a class, so `error instanceof DbAdapterError` is only reliable if your app has a single copy of this package. `@azmr/db` and `@azmr/db-supabase` reuse this package's class, and `@azmr/db/interface` re-exports it. If your lock file ever holds two versions of `@azmr/db-core-interface`, deduplicate them.

## Requirements

- Node.js ≥ 18
- TypeScript ≥ 5 (types included)
- ESM only: `require("@azmr/db-core-interface")` will not work; use `import`.

## License

MIT
