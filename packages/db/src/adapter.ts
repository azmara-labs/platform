import path from "node:path";
import { assertSafeIdentifier, assertSafePath, createAuditLogger } from "@azmr/security";
import Database from "better-sqlite3";
import type { ColumnSchema, ColumnType, DbAdapter, Filter } from "./adapter-interface.js";

const TYPE_MAP: Record<ColumnType, string> = {
  string: "TEXT",
  number: "REAL",
  boolean: "INTEGER",
};

const OPERATOR_MAP: Record<string, string> = {
  eq: "=",
  neq: "!=",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  like: "LIKE",
};

function compileFilterToSql(filter: Filter): { clause: string; params: unknown[] } {
  if (filter.length === 0) return { clause: "", params: [] };

  const parts: string[] = [];
  const params: unknown[] = [];

  for (const { column, operator, value } of filter) {
    assertSafeIdentifier(column, "column name");

    switch (operator) {
      case "eq":
      case "neq":
      case "gt":
      case "gte":
      case "lt":
      case "lte":
      case "like":
        parts.push(`"${column}" ${OPERATOR_MAP[operator]} ?`);
        params.push(value);
        break;
      case "ilike":
        // SQLite has no native ILIKE - LIKE + NOCASE collation is the equivalent.
        parts.push(`"${column}" LIKE ? COLLATE NOCASE`);
        params.push(value);
        break;
      case "is":
        if (value === null) {
          parts.push(`"${column}" IS NULL`);
        } else {
          // SQLite booleans are stored as INTEGER per TYPE_MAP.
          parts.push(`"${column}" IS ?`);
          params.push(value ? 1 : 0);
        }
        break;
      case "in": {
        const values = value as unknown[];
        if (values.length === 0) {
          // Mirrors PostgREST's `.in(col, [])` semantics: zero rows, no params.
          parts.push("0 = 1");
        } else {
          parts.push(`"${column}" IN (${values.map(() => "?").join(", ")})`);
          params.push(...values);
        }
        break;
      }
    }
  }

  return { clause: parts.join(" AND "), params };
}

/**
 * Secure SQLite adapter.
 *
 * Security properties:
 * - All table/column names validated as safe identifiers before use
 * - All values inserted via parameterised statements (never string-concatenated)
 * - WAL journal mode for integrity and performance
 * - foreign_keys and secure_delete PRAGMAs enabled
 * - DB path validated to stay within allowed base directory
 * - All mutations written to tamper-evident audit log
 */
export class SQLiteAdapter implements DbAdapter {
  private readonly db: Database.Database;
  private readonly audit = createAuditLogger("db");
  private readonly dbPath: string;

  constructor(dbPath: string, allowedBase?: string) {
    const resolved = path.resolve(dbPath);

    if (allowedBase) {
      assertSafePath(resolved, allowedBase);
    }

    this.dbPath = resolved;
    this.db = new Database(resolved);

    // Security & integrity PRAGMAs
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.db.pragma("secure_delete = ON");
    this.db.pragma("trusted_schema = OFF");
  }

  async createTable(name: string, schema: ColumnSchema): Promise<void> {
    assertSafeIdentifier(name, "table name");
    const columns = Object.entries(schema)
      .map(([col, type]) => {
        assertSafeIdentifier(col, "column name");
        return `"${col}" ${TYPE_MAP[type]} NOT NULL`;
      })
      .join(", ");

    this.db.prepare(`CREATE TABLE IF NOT EXISTS "${name}" (${columns})`).run();
    this.audit.log("createTable", { table: name });
  }

  async insert<T extends Record<string, unknown>>(name: string, row: T): Promise<void> {
    assertSafeIdentifier(name, "table name");

    const keys = Object.keys(row);
    for (const key of keys) assertSafeIdentifier(key, "column name");

    const cols = keys.map((k) => `"${k}"`).join(", ");
    const placeholders = keys.map(() => "?").join(", ");
    const values = Object.values(row);

    this.db.prepare(`INSERT INTO "${name}" (${cols}) VALUES (${placeholders})`).run(values);
    this.audit.log("insert", { table: name, rowCount: 1 });
  }

  async insertMany<T extends Record<string, unknown>>(name: string, rows: T[]): Promise<void> {
    assertSafeIdentifier(name, "table name");
    if (rows.length === 0) return;

    // biome-ignore lint/style/noNonNullAssertion: rows.length === 0 checked above
    const keys = Object.keys(rows[0]!);
    for (const key of keys) assertSafeIdentifier(key, "column name");

    const cols = keys.map((k) => `"${k}"`).join(", ");
    const placeholders = keys.map(() => "?").join(", ");
    const stmt = this.db.prepare(`INSERT INTO "${name}" (${cols}) VALUES (${placeholders})`);

    const insertAll = this.db.transaction((data: T[]) => {
      for (const row of data) stmt.run(Object.values(row));
    });

    insertAll(rows);
    this.audit.log("insertMany", { table: name, rowCount: rows.length });
  }

  async getAll<T = unknown>(name: string): Promise<T[]> {
    assertSafeIdentifier(name, "table name");
    return this.db.prepare(`SELECT * FROM "${name}"`).all() as T[];
  }

  async findWhere<T = unknown>(name: string, filter: Filter): Promise<T[]> {
    assertSafeIdentifier(name, "table name");
    const { clause, params } = compileFilterToSql(filter);
    const sql = `SELECT * FROM "${name}"${clause ? ` WHERE ${clause}` : ""}`;
    return this.db.prepare(sql).all(params) as T[];
  }

  /**
   * Execute a raw SELECT statement. Only SELECT is permitted — any other
   * statement type throws immediately. Params are passed through
   * better-sqlite3's parameterised binding so values are never concatenated.
   *
   * Note: `sql` must be developer-authored (e.g. CLI input), not end-user input.
   * SQLite-only escape hatch — not part of the DbAdapter interface.
   */
  async rawSelect<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    if (!/^\s*SELECT\b/i.test(sql)) {
      throw new Error("[azmara/db] rawSelect only accepts SELECT statements");
    }
    return this.db.prepare(sql).all(params) as T[];
  }

  async truncateTable(name: string): Promise<void> {
    assertSafeIdentifier(name, "table name");
    this.db.prepare(`DELETE FROM "${name}"`).run();
    this.audit.log("truncateTable", { table: name });
  }

  async deleteWhere(name: string, filter: Filter): Promise<number> {
    assertSafeIdentifier(name, "table name");
    const { clause, params } = compileFilterToSql(filter);
    const sql = `DELETE FROM "${name}"${clause ? ` WHERE ${clause}` : ""}`;
    const result = this.db.prepare(sql).run(params);
    this.audit.log("deleteWhere", { table: name, changes: result.changes });
    return result.changes;
  }

  async close(): Promise<void> {
    this.db.close();
  }

  /** SQLite-only escape hatch — not part of the DbAdapter interface. */
  get path(): string {
    return this.dbPath;
  }
}
