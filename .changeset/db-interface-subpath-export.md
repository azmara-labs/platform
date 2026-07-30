---
"@azmr/db": minor
---

Add a `./interface` subpath export (`DbAdapter`, `DbAdapterError`, `Filter`,
`FilterCondition`, `FilterOperator`, `ColumnSchema`, `ColumnType`) that never
imports `SQLiteAdapter`, so consumers who only need the storage-agnostic
interface — like `@azmr/db-supabase` — no longer pull in `better-sqlite3` (a
native, node-gyp-built module) transitively. The root `.` export is
unchanged and still includes `SQLiteAdapter`.

Also declares `"sideEffects": false` and corrects the `.` export's condition
order (`types` before `import`), so bundlers can tree-shake the SQLite
adapter out of any build that only imports from `.` for its types/errors.

Non-breaking: purely additive. Consumers on the root `@azmr/db` import are
unaffected; new code (or `@azmr/db-supabase`) can switch to
`@azmr/db/interface` to drop the native-module dependency entirely.
