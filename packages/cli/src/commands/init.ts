import fs from "node:fs";
import path from "node:path";

const NAME_RE = /^[a-z0-9][a-z0-9-_]*$/;

// ── Scaffold templates ─────────────────────────────────────────────────────

function packageJson(name: string): string {
  return JSON.stringify(
    {
      name,
      version: "0.1.0",
      type: "module",
      scripts: {
        dev: "tsx src/index.ts",
        build: "tsc",
      },
      dependencies: {
        "@azmr/core": "latest",
        "@azmr/db": "latest",
        "@azmr/query": "latest",
      },
      devDependencies: {
        tsx: "latest",
        typescript: "^5.7.3",
        "@types/node": "^22.0.0",
      },
    },
    null,
    2,
  );
}

const tsconfigJson = JSON.stringify(
  {
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
      outDir: "dist",
      rootDir: "src",
      skipLibCheck: true,
    },
    include: ["src"],
  },
  null,
  2,
);

const gitignore = `node_modules/
dist/
.azmara/
.env.local
*.db
`;

const envExample = `# Add your environment variables here
# Copy to .env.local — never commit .env.local

# Required for @azmr/ai (coming soon)
# ANTHROPIC_API_KEY=
`;

function indexTs(name: string): string {
  return `\
/**
 * ${name} — built with Azmara Platform
 */
import { Signal, computed, effect } from "@azmr/core";
import { query } from "@azmr/query";
import { SQLiteAdapter } from "@azmr/db";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_BASE = path.join(__dirname, "../.azmara");
const DB_PATH = path.join(DB_BASE, "app.db");

// ── 1. Reactive Signals ────────────────────────────────────────────────────
const price = new Signal(100);
const withGst = computed(() => price.get() * 1.15);

effect(() => {
  console.log(\`price: $\${price.get()}  →  with GST: $\${withGst.get().toFixed(2)}\`);
});

price.set(200);

// ── 2. Query Engine ────────────────────────────────────────────────────────
const products = [
  { name: "Widget A", price: 29.99, inStock: true  },
  { name: "Widget B", price: 49.99, inStock: false },
  { name: "Widget C", price: 9.99,  inStock: true  },
];

const available = query(products)
  .where((p) => p.inStock)
  .orderBy((a, b) => a.price - b.price)
  .select();

console.log("\\nAvailable products:");
for (const p of available) {
  console.log(\`  \${p.name}: $\${p.price}\`);
}

// ── 3. SQLite Persistence ──────────────────────────────────────────────────
mkdirSync(DB_BASE, { recursive: true });
const db = new SQLiteAdapter(DB_PATH, DB_BASE);

await db.createTable("products", { name: "string", price: "number", inStock: "boolean" });
await db.truncateTable("products");
await db.insertMany("products", products.map((p) => ({ ...p, inStock: p.inStock ? 1 : 0 })));

const stored = await db.getAll("products");
console.log(\`\\nStored \${stored.length} products to SQLite\`);

await db.close();
console.log("\\n✓ ${name} ready\\n");
`;
}

// ── init command ───────────────────────────────────────────────────────────

/**
 * azmara init <name>
 *
 * Scaffolds a new Azmara app in ./<name>/ with reactive signals, query
 * engine, and SQLite persistence wired up and ready to run.
 *
 * Usage:
 *   azmara init my-app
 */
export function init(args: string[]): void {
  const name = args[0];

  if (!name) {
    console.error("\n  Usage: azmara init <name>\n  Example: azmara init my-app\n");
    process.exit(1);
  }

  if (!NAME_RE.test(name)) {
    console.error(
      `\n  Error: invalid app name "${name}"\n  Names must be lowercase alphanumeric with hyphens or underscores.\n`,
    );
    process.exit(1);
  }

  const appDir = path.resolve(name);

  if (fs.existsSync(appDir)) {
    console.error(`\n  Error: directory already exists: ${appDir}\n`);
    process.exit(1);
  }

  console.log(`\n  Creating Azmara app "${name}"...\n`);

  // Create directory structure
  fs.mkdirSync(path.join(appDir, "src"), { recursive: true });

  // Write files
  const files: Record<string, string> = {
    "package.json": packageJson(name),
    "tsconfig.json": tsconfigJson,
    ".gitignore": gitignore,
    ".env.example": envExample,
    "src/index.ts": indexTs(name),
  };

  for (const [file, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(appDir, file), content, "utf-8");
    console.log(`  ✓  ${file}`);
  }

  console.log(`
  ✓ Done! Get started:

    cd ${name}
    pnpm install
    pnpm dev
`);
}
