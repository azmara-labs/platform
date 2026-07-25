---
"@azmr/db-supabase": minor
---

Initial release. `SupabaseAdapter` implements `@azmr/db`'s `DbAdapter`
interface backed by `supabase-js`'s PostgREST query builder, so RLS is
enforced automatically from whatever `SupabaseClient` the caller injects —
this package never constructs its own client and never bypasses RLS.

`createTable` always throws (PostgREST can't run DDL — manage schema via the
Supabase SQL editor, CLI migrations, or dashboard). Every method validates
identifiers via `@azmr/security`'s `assertSafeIdentifier`, and every
`{data, error}` tuple from `supabase-js` is checked — a failure throws a
`DbAdapterError` carrying the Postgres error's `code`/`details`/`hint`, never
silently swallowed into a generic string.
