# @azmr/query

Chainable, type-safe query builder for arrays and reactive Signals. Filter, sort, limit, and paginate data with zero boilerplate.

## Install

```bash
pnpm add @azmr/query @azmr/core
# or
npm install @azmr/query @azmr/core
```

## Usage

```typescript
import { query } from "@azmr/query";

const customers = [
  { name: "Aroha", balance: 150 },
  { name: "Tane",  balance: 0 },
  { name: "Mere",  balance: 320 },
];

const result = query(customers)
  .where(c => c.balance > 0)
  .orderBy((a, b) => b.balance - a.balance)
  .select();
// → [{ name: "Mere", balance: 320 }, { name: "Aroha", balance: 150 }]
```

## With a reactive Signal

```typescript
import { Signal } from "@azmr/core";
import { query } from "@azmr/query";

const data = new Signal(customers);

const active = query(data)
  .where(c => c.balance > 0)
  .select();
// Re-evaluate in an effect or React render to get live updates
```

## API

| Method | Description |
|---|---|
| `.where(fn)` | Filter rows with a predicate function |
| `.orderBy(fn)` | Sort with comparator `(a, b) => number` |
| `.limit(n)` | Return at most `n` rows |
| `.offset(n)` | Skip first `n` rows |
| `.select()` | Execute — returns `T[]` |
| `.count()` | Returns count of matching rows |
| `.first()` | Returns first match or `undefined` |

String-based predicates are rejected at both type and runtime level — only TypeScript functions accepted.

## Requirements

- Node.js ≥ 18
- TypeScript ≥ 5 (types included)
- ESM only — no CommonJS build. `require("@azmr/query")` will not work; use `import`.

## Documentation

Full docs at [docs.azmara.io](https://docs.azmara.io)

## License

MIT © [Azmara Labs](https://azmara.io)
