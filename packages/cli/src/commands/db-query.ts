import fs from "node:fs";
import path from "node:path";
import { SQLiteAdapter } from "@azmr/db";
import { sanitiseForLog } from "@azmr/security";
import { renderTable } from "../utils/table.js";

/**
 * azmara db:query <db-path> "<sql>"
 *
 * Executes a read-only SELECT against a local SQLite database and prints
 * results as a formatted table. Only SELECT statements are accepted.
 *
 * Usage:
 *   azmara db:query .azmara/app.db "SELECT * FROM customers"
 *   azmara db:query .azmara/app.db "SELECT name, balance FROM customers WHERE balance > 0"
 */
export async function dbQuery(args: string[]): Promise<void> {
  const [dbPathArg, sql] = args;

  if (!dbPathArg || !sql) {
    console.error(
      '\nUsage: azmara db:query <db-path> "<sql>"\n' +
        'Example: azmara db:query .azmara/app.db "SELECT * FROM customers"\n',
    );
    process.exit(1);
  }

  const dbPath = path.resolve(dbPathArg);
  const dbBase = path.dirname(dbPath);

  if (!fs.existsSync(dbPath)) {
    console.error(`\n  Error: database not found: ${sanitiseForLog(dbPathArg)}\n`);
    process.exit(1);
  }

  let db: SQLiteAdapter | null = null;
  try {
    db = new SQLiteAdapter(dbPath, dbBase);
    const rows = (await db.rawSelect(sql)) as Record<string, unknown>[];

    console.log(`\n  ${rows.length} row${rows.length === 1 ? "" : "s"}\n`);
    console.log(renderTable(rows));
    console.log();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\n  Error: ${msg}\n`);
    process.exit(1);
  } finally {
    await db?.close();
  }
}
