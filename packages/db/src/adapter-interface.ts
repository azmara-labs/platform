// The DbAdapter contract now lives in @azmr/db-core-interface so that adapters which have nothing
// to do with SQLite (such as @azmr/db-supabase) can depend on it without installing
// better-sqlite3. This file keeps the "@azmr/db/interface" entry working for existing imports.
export type {
  ColumnSchema,
  ColumnType,
  DbAdapter,
  Filter,
  FilterCondition,
  FilterOperator,
} from "@azmr/db-core-interface";
export { DbAdapterError } from "@azmr/db-core-interface";
