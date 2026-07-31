# @azmr/db-supabase

Async `DbAdapter` implementation backed by Supabase's PostgREST query builder — a drop-in cloud counterpart to `@azmr/db`'s `SQLiteAdapter`, implementing the same [`DbAdapter`](https://github.com/azmara-labs/platform/tree/main/packages/db) interface.

## Install

```bash
pnpm add @azmr/db-supabase @supabase/supabase-js
# or
npm install @azmr/db-supabase @supabase/supabase-js
```

`@supabase/supabase-js` is a peer dependency — bring your own client so you keep full control over auth, session, and cookie wiring (e.g. `@supabase/ssr`'s browser vs. server client constructors).

## Usage

```typescript
import { createClient } from "@supabase/supabase-js";
import { SupabaseAdapter } from "@azmr/db-supabase";

const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
const db = new SupabaseAdapter(client);

await db.insert("products", { name: "Widget A", price: 9.99 });

const inStock = await db.findWhere("products", [
  { column: "inStock", operator: "is", value: true },
]);
```

RLS is enforced automatically, based on whatever JWT the `SupabaseClient` you pass in carries — this package never constructs its own client or bypasses that.

## What's different from `SQLiteAdapter`

- **Async throughout.** Every method returns a `Promise` (PostgREST is a network call; SQLite is not).
- **No `rawSelect`.** PostgREST doesn't accept arbitrary SQL — use `findWhere` with a structured `Filter` instead.
- **`createTable` always throws.** PostgREST can't run DDL. Manage your Supabase schema via the SQL editor, CLI migrations, or dashboard — this package is intentionally bring-your-own-schema.
- **Errors are never swallowed.** Every `{data, error}` tuple from `supabase-js` is checked; on failure this throws a `DbAdapterError` carrying the original Postgres error's `code`/`details`/`hint` (plus the raw error as `.cause`) — never a generic stringified message.

## Filter shape

```typescript
type Filter = Array<{
  column: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "ilike" | "is" | "in";
  value: unknown;
}>;
```

Conditions are implicitly AND-combined. No OR support yet.

## Runtime footprint

`@azmr/db-supabase` depends on `@azmr/db`, but only via its `./interface` subpath (`DbAdapter`, `DbAdapterError`, `Filter` types) — the same PostgREST-only module graph you'd expect from a pure network client. It does **not** pull in `better-sqlite3` or any native module, so it's safe to bundle into serverless/edge runtimes (Vercel, Next.js server components/actions, Cloudflare Workers, etc.).

## Requirements

- Node.js ≥ 18
- `@supabase/supabase-js` ^2.103.0
- ESM only — no CommonJS build. `require("@azmr/db-supabase")` will not work; use `import`.

## Documentation

Full docs at [docs.azmara.io](https://docs.azmara.io)

## License

MIT © [Azmara Labs](https://azmara.io)
