---
"@azmr/db": major
---

`SQLiteAdapter`'s methods are now all `async` (previously synchronous) — a
breaking change to every existing call site. This aligns `@azmr/db` with a
new, extracted `DbAdapter` interface that a cloud-backed adapter
(`@azmr/db-supabase`) also implements, so callers can swap SQLite for
Supabase behind the same shape.

- `deleteWhere`'s signature changed from `(name, condition: string, params)`
  to `(name, filter: Filter)` — a structured, backend-portable filter shape
  (`{column, operator, value}[]`) replacing raw SQL fragments, since a
  cloud/PostgREST-backed adapter can't accept arbitrary SQL strings.
- New `findWhere(name, filter)` method, using the same `Filter` shape.
- `rawSelect` and the `path` getter remain SQLite-only escape hatches, not
  part of the shared `DbAdapter` interface.
- New exports: `DbAdapter`, `Filter`, `FilterCondition`, `FilterOperator`,
  `DbAdapterError`.

Existing callers need to add `await` at every `SQLiteAdapter` call site.
