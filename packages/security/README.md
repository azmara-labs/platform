# @azmr/security

Security utilities for the Azmara platform — input validation, environment guards, identifier sanitisation, and a tamper-evident hash-chained audit log. Built around OWASP Top 10 mitigations.

## Install

```bash
pnpm add @azmr/security
# or
npm install @azmr/security
```

## Usage

```typescript
import {
  validateEnv,
  validateInput,
  assertSafeIdentifier,
  assertSafePath,
  sanitiseForLog,
  createAuditLogger,
} from "@azmr/security";
import { z } from "zod";

// Fail fast if required env vars are missing
validateEnv(["DATABASE_URL", "API_KEY"]);

// Validate input at server boundaries
const UserSchema = z.object({ name: z.string().min(1), age: z.number().min(0) });
const user = validateInput(UserSchema, req.body);

// Safe logging — strips newlines, truncates
console.log(sanitiseForLog(userInput));

// Tamper-evident audit log
const audit = createAuditLogger("my-service");
audit.log("user:login", { userId: "123" });
```

## API

| Export | Description |
|---|---|
| `validateEnv(keys)` | Throws if any required env var is missing |
| `validateInput(schema, data)` | Zod-based validation, throws on failure |
| `assertSafeIdentifier(name)` | Validates DB/SQL identifiers — `[a-zA-Z_][a-zA-Z0-9_]*` |
| `assertSafePath(path, base)` | Prevents path traversal attacks |
| `sanitiseForLog(input)` | Strips newlines, truncates to 200 chars |
| `createAuditLogger(module)` | Hash-chained append-only audit log |

## Requirements

- Node.js ≥ 18
- TypeScript ≥ 5 (types included)

## Documentation

Full docs at [platform.azmara.io](https://platform.azmara.io/docs/packages/security)

## License

MIT © [Azmara Labs](https://azmara.io)
