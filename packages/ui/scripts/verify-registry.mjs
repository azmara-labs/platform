// End-to-end check of the shadcn-compatible registry, the way a consumer uses it:
//
//   node scripts/verify-registry.mjs [--keep]
//
// 1. Builds the registry (scripts/build-registry.mjs) and serves it from a local HTTP server at
//    /r/{name}.json, the same layout as https://platform.azmara.io/r/.
// 2. Copies a standard shadcn-style Next.js + Tailwind v4 app (fixtures/registry-app, with NO
//    @azmr/ui dependency) to a temp directory and installs it.
// 3. Runs the real `shadcn add @azmr/button` against the local server.
// 4. Checks what landed (files, aliases, dependencies, CSS), then `next build`s the app and
//    inspects the served page and its CSS.
import { spawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { relativeSpecifiers } from "./registry-transform.mjs";

const UI = resolve(import.meta.dirname, "..");
const FIXTURE = join(UI, "fixtures", "registry-app");
const REGISTRY_PORT = 4175; // matches fixtures/registry-app/components.json
const APP_PORT = Number(process.env.FIXTURE_PORT ?? 4176);
const keep = process.argv.includes("--keep");
const isWin = process.platform === "win32";

const failures = [];
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "  ok  " : "  FAIL"} ${name}${ok || !detail ? "" : `\n         ${detail}`}`);
  if (!ok) failures.push(name);
};
const tail = (text, lines = 30) => text.trim().split("\n").slice(-lines).join("\n");

// Asynchronous on purpose: this process also serves the registry over HTTP, and a blocking
// spawnSync would stop it answering the very CLI it is waiting for.
function run(command, args, cwd) {
  return new Promise((done) => {
    const child = spawn(command, args, {
      cwd,
      shell: isWin,
      // Close stdin: the CLI must never be able to wait on a prompt.
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, CI: "1", NEXT_TELEMETRY_DISABLED: "1" },
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.on("error", (error) =>
      done({
        ok: false,
        output: `${output}
spawn error: ${error.message}`,
      }),
    );
    child.on("close", (code) =>
      done({
        ok: code === 0,
        output: `${output}
exit status: ${code}`,
      }),
    );
  });
}

const work = mkdtempSync(join(tmpdir(), "azmr-registry-"));
let registryServer;
let appServer;
const stop = (child) => {
  if (!child?.pid) return;
  if (isWin) spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  else {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {}
  }
};

async function main() {
  // 1. Build the registry and serve it.
  const served = join(work, "serve");
  const built = await run("node", ["scripts/build-registry.mjs", "--out", join(served, "r")], UI);
  check("registry builds", built.ok, tail(built.output));
  if (!built.ok) return;

  registryServer = createServer((req, res) => {
    const name = (req.url ?? "").split("?")[0];
    const file = join(served, name);
    if (!file.startsWith(served) || !existsSync(file)) {
      res.writeHead(404).end("not found");
      return;
    }
    res.writeHead(200, { "content-type": "application/json" }).end(readFileSync(file));
  });
  await new Promise((done) => registryServer.listen(REGISTRY_PORT, "127.0.0.1", done));

  // 2. A fresh consumer app.
  const app = join(work, "app");
  cpSync(FIXTURE, app, {
    recursive: true,
    filter: (src) => !/[\\/](node_modules|\.next)([\\/]|$)/.test(src),
  });
  const install = await run("pnpm", ["install", "--ignore-workspace", "--no-frozen-lockfile"], app);
  check("fixture app installs", install.ok, tail(install.output));
  if (!install.ok) return;
  check(
    "the app starts with no @azmr/ui and no button",
    !existsSync(join(app, "node_modules", "@azmr")) &&
      !existsSync(join(app, "components", "ui", "button.tsx")),
  );

  // 3. The real shadcn CLI, from this package's pinned devDependency.
  const add = await run(
    "pnpm",
    ["exec", "shadcn", "add", "@azmr/button", "--yes", "--cwd", app],
    UI,
  );
  check("`shadcn add @azmr/button` succeeds against the local registry", add.ok, tail(add.output));
  if (!add.ok) return;

  // 4. What landed.
  const ui = join(app, "components", "ui");
  const files = existsSync(ui) ? readdirSync(ui) : [];
  check("button.tsx was copied into components/ui", files.includes("button.tsx"), files.join(", "));
  check(
    "its registry dependency spinner.tsx came with it",
    files.includes("spinner.tsx"),
    files.join(", "),
  );
  for (const name of ["button.tsx", "spinner.tsx"]) {
    const path = join(ui, name);
    if (!existsSync(path)) continue;
    const code = readFileSync(path, "utf8");
    check(`${name} has no relative imports left`, relativeSpecifiers(code).length === 0);
    check(`${name} imports cn from the app's own alias`, /from ["']@\/lib\/utils["']/.test(code));
  }
  const button = existsSync(join(ui, "button.tsx"))
    ? readFileSync(join(ui, "button.tsx"), "utf8")
    : "";
  check("button imports Base UI directly", button.includes("@base-ui/react/button"));
  check(
    "button imports the app's spinner by alias",
    /from ["']@\/components\/ui\/spinner["']/.test(button),
  );

  const pkg = JSON.parse(readFileSync(join(app, "package.json"), "utf8"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  check("@base-ui/react was added to the app's dependencies", Boolean(deps["@base-ui/react"]));
  check(
    "class-variance-authority was added to the app's dependencies",
    Boolean(deps["class-variance-authority"]),
  );

  // 5. It must build and style correctly in the consumer app.
  const build = await run("pnpm", ["exec", "next", "build"], app);
  check("the app builds with the copied components", build.ok, tail(build.output));
  if (!build.ok) return;

  appServer = spawn("pnpm", ["exec", "next", "start", "-p", String(APP_PORT)], {
    cwd: app,
    shell: isWin,
    detached: !isWin,
    stdio: "ignore",
  });
  let html = "";
  for (let i = 0; i < 60 && !html; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${APP_PORT}/`);
      if (response.ok) html = await response.text();
    } catch {}
    if (!html) await sleep(1000);
  }
  check("the app serves the page", html.length > 0);
  if (!html) return;
  check("the Button renders", /<button[^>]*type="button"/.test(html) && html.includes("Save"));
  check("the loading Button is busy", html.includes('aria-busy="true"'));

  const sheets = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map(
    (m) => m[1],
  );
  let css = "";
  for (const href of sheets) {
    css += await (await fetch(new URL(href, `http://127.0.0.1:${APP_PORT}`))).text();
  }
  check("Tailwind generated the Button's classes in the app", css.includes(".bg-primary"));

  // The tokens item: a standard shadcn app has no density, motion or destructive-foreground
  // tokens, so without it the copied Button would have no height, padding or readable text.
  const globals = readFileSync(join(app, "app", "globals.css"), "utf8");
  const original = readFileSync(join(FIXTURE, "app", "globals.css"), "utf8");
  check(
    "the tokens item added the density tokens to globals.css",
    globals.includes("--density-control-height"),
  );
  // `--x: var(--x)` is a reference cycle. The CLI writes one for every non-colour cssVars key it
  // is given; the item avoids that by shipping those tokens as plain css.
  const selfReferences = (text) =>
    text
      .split(/[;{}]/)
      .map((declaration) => declaration.trim())
      .filter((declaration) => {
        const colon = declaration.indexOf(":");
        if (!declaration.startsWith("--") || colon < 0) return false;
        const name = declaration.slice(0, colon).trim();
        return declaration.slice(colon + 1).replace(/\s+/g, "") === `var(${name})`;
      });
  check(
    "globals.css has no self-referencing variables",
    selfReferences(globals).length === 0,
    selfReferences(globals).slice(0, 5).join(" | "),
  );
  check(
    "the served CSS has no self-referencing variables",
    selfReferences(css).length === 0,
    selfReferences(css).slice(0, 5).join(" | "),
  );
  check("it added the density variants", globals.includes("data-density"));
  check(
    "it added destructive-foreground for light and dark",
    (globals.match(/--destructive-foreground:/g) ?? []).length >= 2,
  );
  check("it added the reduced-motion rules", globals.includes("prefers-reduced-motion"));
  const primary = (text) => /--primary:\s*([^;]+);/.exec(text)?.[1];
  check(
    "it left the app's own palette alone (--primary unchanged)",
    primary(globals) !== undefined && primary(globals) === primary(original),
    `${primary(original)} -> ${primary(globals)}`,
  );
  check(
    "the served CSS defines the density token the Button's height uses",
    /--density-control-height:\s*2\.25rem/.test(css),
  );
  check(
    "Tailwind generated text-destructive-foreground (the mapping was added)",
    css.includes(".text-destructive-foreground"),
  );
  check("Tailwind generated the ease-standard utility", css.includes(".ease-standard"));
}

try {
  await main();
} catch (error) {
  failures.push("unexpected error");
  console.error(String(error?.stack ?? error));
} finally {
  stop(appServer);
  registryServer?.close();
  if (keep) console.log(`kept: ${work}`);
  else rmSync(work, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`\nregistry verification FAILED:\n  - ${failures.join("\n  - ")}`);
  process.exit(1);
}
console.log("\nregistry verification passed");
