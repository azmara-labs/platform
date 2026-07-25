import path from "node:path";
import { fileURLToPath } from "node:url";
/**
 * Azmara Playground
 * Demonstrates core + query + db working together.
 */
import { computed, effect, Signal } from "@azmr/core";
import { SQLiteAdapter } from "@azmr/db";
import { query } from "@azmr/query";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "../.azmara/playground.db");
const DB_BASE = path.join(__dirname, "../.azmara");

// ── 1. Reactive Engine ────────────────────────────────────────────────────────
console.log("\n── Reactive Engine ──");

const count = new Signal(0);
const doubled = computed(() => count.get() * 2);

effect(() => {
  console.log(`  count=${count.get()}  doubled=${doubled.get()}`);
});

count.set(1);
count.set(5);

// ── 2. Query Engine ───────────────────────────────────────────────────────────
console.log("\n── Query Engine ──");

const customers = [
  { name: "Aroha", balance: 150 },
  { name: "Tane", balance: 0 },
  { name: "Mere", balance: 320 },
  { name: "Hemi", balance: -10 },
];

const active = query(customers)
  .where((c) => c.balance > 0)
  .orderBy((a, b) => b.balance - a.balance)
  .select();

console.log("  Active customers (balance > 0, sorted desc):");
for (const c of active) {
  console.log(`    ${c.name}: $${c.balance}`);
}

// ── 3. SQLite Persistence ─────────────────────────────────────────────────────
console.log("\n── SQLite Persistence ──");

import { mkdirSync } from "node:fs";

mkdirSync(DB_BASE, { recursive: true });

const db = new SQLiteAdapter(DB_PATH, DB_BASE);

await db.createTable("products", { name: "string", price: "number", inStock: "boolean" });
await db.truncateTable("products");
await db.insertMany("products", [
  { name: "Widget A", price: 29.99, inStock: 1 },
  { name: "Widget B", price: 49.99, inStock: 0 },
  { name: "Widget C", price: 9.99, inStock: 1 },
]);

const products = await db.getAll<{ name: string; price: number; inStock: number }>("products");
const available = query(products)
  .where((p) => p.inStock === 1)
  .orderBy((a, b) => a.price - b.price)
  .select();

console.log("  Available products (sorted by price asc):");
for (const p of available) {
  console.log(`    ${p.name}: $${p.price}`);
}

await db.close();
console.log("\n✓ Playground complete\n");
