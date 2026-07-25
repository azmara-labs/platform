import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SQLiteAdapter } from "./adapter.js";

function tmpDb(): { db: SQLiteAdapter; dir: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "azmara-test-"));
  const db = new SQLiteAdapter(path.join(dir, "test.db"), dir);
  return { db, dir };
}

describe("SQLiteAdapter — createTable / insert / getAll", () => {
  it("creates a table and inserts a row", async () => {
    const { db, dir } = tmpDb();
    await db.createTable("users", { name: "string", age: "number" });
    await db.insert("users", { name: "Aroha", age: 25 });
    const rows = await db.getAll<{ name: string; age: number }>("users");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("Aroha");
    await db.close();
    fs.rmSync(dir, { recursive: true });
  });

  it("insertMany inserts all rows in a transaction", async () => {
    const { db, dir } = tmpDb();
    await db.createTable("products", { name: "string", price: "number" });
    await db.insertMany("products", [
      { name: "Widget A", price: 9.99 },
      { name: "Widget B", price: 19.99 },
      { name: "Widget C", price: 4.99 },
    ]);
    expect(await db.getAll("products")).toHaveLength(3);
    await db.close();
    fs.rmSync(dir, { recursive: true });
  });

  it("createTable is idempotent", async () => {
    const { db, dir } = tmpDb();
    await db.createTable("items", { label: "string" });
    await expect(db.createTable("items", { label: "string" })).resolves.not.toThrow();
    await db.close();
    fs.rmSync(dir, { recursive: true });
  });
});

describe("SQLiteAdapter — findWhere / deleteWhere (Filter)", () => {
  async function seeded() {
    const { db, dir } = tmpDb();
    await db.createTable("products", { name: "string", price: "number", inStock: "boolean" });
    await db.insertMany("products", [
      { name: "Widget A", price: 9.99, inStock: 1 },
      { name: "Widget B", price: 19.99, inStock: 0 },
      { name: "Widget C", price: 4.99, inStock: 1 },
    ]);
    return { db, dir };
  }

  it("findWhere returns rows matching an eq filter", async () => {
    const { db, dir } = await seeded();
    const rows = await db.findWhere<{ name: string }>("products", [
      { column: "name", operator: "eq", value: "Widget A" },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("Widget A");
    await db.close();
    fs.rmSync(dir, { recursive: true });
  });

  it("findWhere combines multiple conditions with AND", async () => {
    const { db, dir } = await seeded();
    const rows = await db.findWhere("products", [
      { column: "inStock", operator: "is", value: true },
      { column: "price", operator: "gt", value: 5 },
    ]);
    expect(rows).toHaveLength(1);
    await db.close();
    fs.rmSync(dir, { recursive: true });
  });

  it("findWhere with an empty 'in' array returns zero rows", async () => {
    const { db, dir } = await seeded();
    const rows = await db.findWhere("products", [{ column: "name", operator: "in", value: [] }]);
    expect(rows).toHaveLength(0);
    await db.close();
    fs.rmSync(dir, { recursive: true });
  });

  it("findWhere with no conditions returns all rows", async () => {
    const { db, dir } = await seeded();
    const rows = await db.findWhere("products", []);
    expect(rows).toHaveLength(3);
    await db.close();
    fs.rmSync(dir, { recursive: true });
  });

  it("deleteWhere deletes only matching rows and returns the count", async () => {
    const { db, dir } = await seeded();
    const changes = await db.deleteWhere("products", [
      { column: "inStock", operator: "is", value: false },
    ]);
    expect(changes).toBe(1);
    expect(await db.getAll("products")).toHaveLength(2);
    await db.close();
    fs.rmSync(dir, { recursive: true });
  });
});

describe("SQLiteAdapter — identifier injection protection", () => {
  it("blocks SQL injection in table name", async () => {
    const { db, dir } = tmpDb();
    await expect(
      db.createTable("users; DROP TABLE users; --", { name: "string" }),
    ).rejects.toThrow();
    await db.close();
    fs.rmSync(dir, { recursive: true });
  });

  it("blocks SQL injection in column name", async () => {
    const { db, dir } = tmpDb();
    await expect(
      db.createTable("safe", { "col; DROP TABLE safe; --": "string" }),
    ).rejects.toThrow();
    await db.close();
    fs.rmSync(dir, { recursive: true });
  });

  it("blocks empty table name", async () => {
    const { db, dir } = tmpDb();
    await expect(db.createTable("", { name: "string" })).rejects.toThrow();
    await db.close();
    fs.rmSync(dir, { recursive: true });
  });

  it("blocks table name starting with a number", async () => {
    const { db, dir } = tmpDb();
    await expect(db.createTable("1invalid", { name: "string" })).rejects.toThrow();
    await db.close();
    fs.rmSync(dir, { recursive: true });
  });

  it("blocks SQL injection in a findWhere filter column", async () => {
    const { db, dir } = tmpDb();
    await db.createTable("safe", { name: "string" });
    await expect(
      db.findWhere("safe", [{ column: "name; DROP TABLE safe; --", operator: "eq", value: "x" }]),
    ).rejects.toThrow();
    await db.close();
    fs.rmSync(dir, { recursive: true });
  });
});

describe("SQLiteAdapter — path traversal protection", () => {
  it("blocks path traversal outside allowed base", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "azmara-test-"));
    expect(() => new SQLiteAdapter(path.join(dir, "../../etc/evil.db"), dir)).toThrow();
    fs.rmSync(dir, { recursive: true });
  });

  it("blocks null byte in path", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "azmara-test-"));
    expect(() => new SQLiteAdapter(path.join(dir, "file\0.db"), dir)).toThrow();
    fs.rmSync(dir, { recursive: true });
  });
});
