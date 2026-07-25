#!/usr/bin/env node
import { sanitiseForLog } from "@azmr/security";
import { auditVerify } from "./commands/audit-verify.js";
import { dbQuery } from "./commands/db-query.js";
import { init } from "./commands/init.js";
import { policycoreScan } from "./commands/policycore-scan.js";

const [, , command, ...args] = process.argv;

const COMMANDS: Record<string, (args: string[]) => void | Promise<void>> = {
  version(_args) {
    console.log("azmara v0.0.1");
  },

  help(_args) {
    console.log(`
  Azmara CLI

  Usage:
    azmara <command> [options]

  Commands:
    init <name>              Scaffold a new Azmara app
    db:query <db> "<sql>"    Run a SELECT query against a local SQLite database
    policycore:scan [path]   Scan a project for security-policy issues
    version                  Print CLI version
    help                     Show this help message

  Coming soon:
    fix <file>               AI-assisted code fix (requires API key)

  Examples:
    azmara init my-app
    azmara db:query .azmara/app.db "SELECT * FROM customers"
    azmara audit:verify
    azmara audit:verify path/to/audit.log
    azmara policycore:scan
    azmara policycore:scan ./apps/api --format=json
    azmara policycore:scan --format=owasp-md
`);
  },

  init,
  "db:query": dbQuery,
  "audit:verify": auditVerify,
  "policycore:scan": policycoreScan,
};

async function main() {
  if (!command) {
    COMMANDS.help?.([]);
    process.exit(0);
  }

  const handler = COMMANDS[command];
  if (!handler) {
    console.error(
      `\n  Unknown command: "${sanitiseForLog(command)}"\n  Run "azmara help" for usage.\n`,
    );
    process.exit(1);
  }

  await handler(args);
}

main().catch((err) => {
  console.error(
    "\n  [azmara] Fatal error:",
    err instanceof Error ? err.message : String(err),
    "\n",
  );
  process.exit(1);
});
