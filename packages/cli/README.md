# @azmr/cli

The Azmara CLI — scaffold new apps, query local SQLite databases, and manage your platform from the terminal.

## Install

```bash
pnpm add -g @azmr/cli
# or
npm install -g @azmr/cli
```

## Commands

### `azmara init <name>`

Scaffold a new Azmara app with reactive signals, query engine, and SQLite all wired up.

```bash
azmara init my-app
cd my-app
pnpm install
pnpm dev
```

Creates:
```
my-app/
├── package.json      (@azmr/core, @azmr/db, @azmr/query)
├── tsconfig.json
├── .gitignore
├── .env.example
└── src/index.ts      (reactive signals + query + SQLite example)
```

### `azmara db:query <db-path> "<sql>"`

Run a SELECT query against any local SQLite database and display results as a formatted table.

```bash
azmara db:query .azmara/app.db "SELECT * FROM customers"
azmara db:query .azmara/app.db "SELECT name, balance FROM customers WHERE balance > 0"
```

Output:
```
  3 rows

+--------+---------+
| name   | balance |
+--------+---------+
| Mere   | 320     |
| Aroha  | 150     |
| Rangi  | 75      |
+--------+---------+
```

Only SELECT statements are accepted — any other statement type throws immediately.

### `azmara help`

```bash
azmara help
```

### `azmara version`

```bash
azmara version
# → azmara v0.0.1
```

## Coming soon

- `azmara fix <file>` — AI-assisted code fix with approval gate
- `azmara audit:verify` — verify audit log chain integrity
- `azmara analyze <dir>` — scan codebase for issues

## Requirements

- Node.js ≥ 18
- ESM only — no CommonJS build. `require("@azmr/cli")` will not work; use `import`.

## Documentation

Full docs at [docs.azmara.io](https://docs.azmara.io)

## License

MIT © [Azmara Labs](https://azmara.io)
