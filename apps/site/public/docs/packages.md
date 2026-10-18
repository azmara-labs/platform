# Packages

> Every @azmr package, what it is for, its current version and where to find its docs, changelog and source.

Source: https://platform.azmara.io/docs/packages

The Azmara platform is a set of small packages that work together and can each be used alone. Packages depend on each other only where they need to: `@azmr/core`, `@azmr/security` and `@azmr/db-core-interface` depend on no other `@azmr` package.

- [`@azmr/core`](https://platform.azmara.io/docs/packages/core.md): Reactive engine — signals, effects, computed values
- [`@azmr/query`](https://platform.azmara.io/docs/packages/query.md): Chainable, data-first query engine over reactive data sources
- [`@azmr/db`](https://platform.azmara.io/docs/packages/db.md): Secure SQLite persistence adapter — parameterised queries, path containment, tamper-evident audit log
- [`@azmr/db-core-interface`](https://platform.azmara.io/docs/packages/db-core-interface.md): The DbAdapter contract shared by @azmr/db and @azmr/db-supabase — types and DbAdapterError, no dependencies
- [`@azmr/db-supabase`](https://platform.azmara.io/docs/packages/db-supabase.md): Async DbAdapter implementation backed by Supabase's PostgREST query builder
- [`@azmr/ui`](https://platform.azmara.io/docs/packages/ui.md): React UI components wired to reactive Signals — Grid, useSignal
- [`@azmr/security`](https://platform.azmara.io/docs/packages/security.md): Security utilities — validation, audit logging, sanitisation, env guards
- [`@azmr/policycore`](https://platform.azmara.io/docs/packages/policycore.md): Standalone security policy engine — rate limits, auth requirements, and CORS as code for the Azmara platform
- [`@azmr/ai`](https://platform.azmara.io/docs/packages/ai.md): AI auto-fix system with capability-scoped isolated-vm sandboxing — safe code execution and analysis
- [`@azmr/cli`](https://platform.azmara.io/docs/packages/cli.md): Azmara CLI — scaffold apps, query local SQLite databases, manage your platform
