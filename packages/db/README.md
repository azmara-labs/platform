# @azmr/db

Secure SQLite persistence adapter built on `better-sqlite3`. Parameterised queries only, identifier validation, path containment, WAL mode, and a tamper-evident audit log baked in.

## Install

```bash
pnpm add @azmr/db
# or
npm install @azmr/db
```

> **Note**: `better-sqlite3` is a native module. Node.js build tools are required — see [better-sqlite3 prerequisites](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/compilation.md).

## Usage

```typescript
import { SQLiteAdapter } from "@azmr/db";

const db = new SQLiteAdapter(".azmara/app.db", ".azmara");

db.createTable("customers", {
  name: "string",
  balance: "number",
  active: "boolean",
});

db.insertMany("customers", [
  { name: "Aroha", balance: 150, active: 1 },
  { name: "Mere",  balance: 320, active: 1 },
]);

const all = db.getAll<{ name: string; balance: number }>("customers");

// Read-only raw query (SELECT only)
const rich = db.rawSelect("SELECT * FROM customers WHERE balance > ?", [100]);

db.close();
```

## API

| Method | Description |
|---|---|
| `createTable(name, schema)` | Create table if not exists |
| `insert(name, row)` | Insert a single row |
| `insertMany(name, rows)` | Insert multiple rows in a transaction |
| `getAll<T>(name)` | Return all rows as `T[]` |
| `truncateTable(name)` | Delete all rows, keep schema |
| `rawSelect(sql, params?)` | SELECT-only raw query |
| `deleteWhere(name, cond, params)` | Delete matching rows |
| `close()` | Close the database connection |

## Column types

| Schema type | SQLite type |
|---|---|
| `"string"` | `TEXT NOT NULL` |
| `"number"` | `REAL NOT NULL` |
| `"boolean"` | `INTEGER NOT NULL` |

## Security features

- All identifiers validated before SQL execution
- All values inserted via parameterised statements — no string concatenation
- `allowedBase` prevents path traversal
- WAL mode, `secure_delete ON`, `foreign_keys ON`
- Every mutation written to a hash-chained audit log

## Requirements

- Node.js ≥ 18
- TypeScript ≥ 5 (types included)
- ESM only — no CommonJS build. `require("@azmr/db")` will not work; use `import`.

## Documentation

Full docs at [docs.azmara.io](https://docs.azmara.io)

## License

MIT © [Azmara Labs](https://azmara.io)
