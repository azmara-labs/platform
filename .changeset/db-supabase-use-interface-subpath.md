---
"@azmr/db-supabase": patch
---

Import `DbAdapterError`, `DbAdapter`, `Filter` from `@azmr/db/interface`
instead of the root `@azmr/db` export, so installing `@azmr/db-supabase`
no longer drags `better-sqlite3` into the module graph. Unblocks
serverless/edge deployments (e.g. Vercel, Next.js) where a native
node-gyp-built module in the server bundle is unwanted or unsupported.
No public API change.
