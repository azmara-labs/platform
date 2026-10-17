# @azmr/db-core-interface

## 0.1.0

### Minor Changes

- 9e4ee63: Move the `DbAdapter` contract (the interface, its filter and schema types, and `DbAdapterError`) into a new dependency-free package, `@azmr/db-core-interface`.

  `@azmr/db-supabase` now depends on it instead of on `@azmr/db`, so installing `@azmr/db-supabase` no longer installs `better-sqlite3`. `@azmr/db` re-exports everything from the package root and from `@azmr/db/interface`, so existing imports keep working and `DbAdapterError` is the same class from every entry point.
