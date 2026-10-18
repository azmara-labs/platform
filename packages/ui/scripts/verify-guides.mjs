// Getting-started guide verification. The docs site has an install guide per framework, and each
// guide shows the files in fixtures/guides/<name> word for word (a docs test checks that). This
// script proves those files work: it packs @azmr/core and @azmr/ui into real tarballs, installs each
// fixture outside the workspace as a new project would, type-checks it, builds it, and inspects the
// result:
//   - the code in the guide type-checks and builds with that framework's current tooling;
//   - Tailwind v4 found the package's classes inside node_modules (the @source rule), so styles are
//     there without the reader adding anything to their config;
//   - the colour tokens and the Button reach the output;
//   - for the server-rendered frameworks, the server really renders the Button and the theme.
//
// Usage:  node scripts/verify-guides.mjs [next|vite|react-router|esbuild ...] [--keep]
//                                         [--sabotage=no-source]
// Requires the packages to be built first (pnpm build). With --sabotage the run MUST fail in the
// expected place; the script exits 0 only when it does, proving the checks can detect that fault.
import { spawn, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const UI = resolve(import.meta.dirname, "..");
const CORE = resolve(UI, "../core");
const GUIDES = join(UI, "fixtures", "guides");
const isWin = process.platform === "win32";
const keep = process.argv.includes("--keep");
const sabotage = process.argv.find((a) => a.startsWith("--sabotage="))?.split("=")[1];
const requested = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const log = (message) => console.log(message);
const failures = [];
const check = (name, ok, detail = "") => {
  log(`${ok ? "  ok  " : "  FAIL"} ${name}${ok || !detail ? "" : `\n         ${detail}`}`);
  if (!ok) failures.push(name);
};
const tail = (text, lines = 40) => text.trim().split("\n").slice(-lines).join("\n");

function run(command, args, cwd, env = {}) {
  const result = spawnSync(command, args, {
    cwd,
    shell: isWin,
    encoding: "utf8",
    env: { ...process.env, CI: "1", NEXT_TELEMETRY_DISABLED: "1", ...env },
  });
  return { ok: result.status === 0, output: `${result.stdout ?? ""}\n${result.stderr ?? ""}` };
}

/** How each guide's fixture is served (or not) and where its built files are. */
const FIXTURES = {
  next: {
    server: { args: ["exec", "next", "start", "-p", "{port}"], port: 4181 },
    // The site's stylesheets are the <link rel="stylesheet"> tags in the served page.
    assets: async ({ base, html }) => ({
      css: await fetchStylesheets(base, html),
      js: "",
    }),
  },
  "react-router": {
    server: {
      args: ["exec", "react-router-serve", "./build/server/index.js"],
      port: 4182,
      env: (port) => ({ PORT: String(port) }),
    },
    assets: async ({ base, html }) => ({
      css: await fetchStylesheets(base, html),
      js: "",
    }),
  },
  vite: {
    assets: ({ app }) => builtFiles(join(app, "dist", "assets")),
  },
  esbuild: {
    assets: ({ app }) => ({
      css: readFileSync(join(app, "dist", "app.css"), "utf8"),
      js: readFileSync(join(app, "dist", "main.js"), "utf8"),
    }),
  },
};

function builtFiles(dir) {
  const read = (ext) =>
    readdirSync(dir)
      .filter((name) => name.endsWith(ext))
      .map((name) => readFileSync(join(dir, name), "utf8"))
      .join("\n");
  return { css: read(".css"), js: read(".js") };
}

async function fetchStylesheets(base, html) {
  const hrefs = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map(
    (m) => m[1],
  );
  let css = "";
  for (const href of hrefs) css += await (await fetch(new URL(href, base))).text();
  return css;
}

const names = requested.length > 0 ? requested : Object.keys(FIXTURES);
for (const name of names) {
  if (!FIXTURES[name] || !existsSync(join(GUIDES, name))) {
    console.error(`unknown guide fixture "${name}" (have: ${Object.keys(FIXTURES).join(", ")})`);
    process.exit(2);
  }
}
for (const dir of [UI, CORE]) {
  if (!existsSync(join(dir, "dist"))) {
    console.error(`dist/ missing in ${dir}: run "pnpm build" first`);
    process.exit(2);
  }
}

const work = mkdtempSync(join(tmpdir(), "azmr-ui-guides-"));
let server;
const stopServer = () => {
  if (!server?.pid) return;
  if (isWin) spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  else {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {}
  }
  server = undefined;
};
const cleanup = () => {
  stopServer();
  if (!keep) rmSync(work, { recursive: true, force: true });
  else log(`kept: ${work}`);
};

async function verify(name, tarballs) {
  const spec = FIXTURES[name];
  log(`\n== ${name}`);
  const app = join(work, name);
  cpSync(join(GUIDES, name), app, {
    recursive: true,
    filter: (src) => !/[\\/](node_modules|\.next|\.react-router|build|dist)([\\/]|$)/.test(src),
  });
  const pkgPath = join(app, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.dependencies["@azmr/core"] = `file:${tarballs.core.replaceAll("\\", "/")}`;
  pkg.dependencies["@azmr/ui"] = `file:${tarballs.ui.replaceAll("\\", "/")}`;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

  // pnpm 10 and newer will not run a dependency's install script unless it is approved, and in CI an
  // unapproved one is an error. Two dependencies here have scripts (esbuild and @parcel/watcher, from
  // the Tailwind CLI) and neither is needed: both ship prebuilt binaries as optional packages. Say so
  // here, the way a project would, so the result does not depend on the machine's own pnpm settings.
  writeFileSync(
    join(app, "pnpm-workspace.yaml"),
    ["allowBuilds:", "  esbuild: false", "  '@parcel/watcher': false", ""].join("\n"),
  );

  // Copy (not hard-link) so sabotage can never touch the pnpm store.
  const install = run(
    "pnpm",
    [
      "install",
      "--ignore-workspace",
      "--no-frozen-lockfile",
      "--config.package-import-method=copy",
    ],
    app,
  );
  check(`${name}: installs with the packed packages`, install.ok, tail(install.output));
  if (!install.ok) return;

  if (sabotage === "no-source") {
    const installed = join(app, "node_modules", "@azmr", "ui", "dist");
    for (const file of ["tokens.css", "styles.css"]) {
      const target = join(installed, file);
      if (existsSync(target)) {
        writeFileSync(target, readFileSync(target, "utf8").replace(/@source[^;]*;/g, ""));
      }
    }
    log("SABOTAGE: removed the @source rule from the installed stylesheets");
  }

  const build = run("pnpm", ["run", "build"], app);
  check(`${name}: builds`, build.ok, tail(build.output));
  if (!build.ok) return;

  // Type-check after the build, because Next and React Router generate types while building.
  const types = run("pnpm", ["run", "typecheck"], app);
  check(`${name}: the guide's code type-checks`, types.ok, tail(types.output));

  let html = "";
  let base = "";
  if (spec.server) {
    const { port } = spec.server;
    base = `http://127.0.0.1:${port}`;
    const args = spec.server.args.map((a) => a.replace("{port}", String(port)));
    server = spawn("pnpm", args, {
      cwd: app,
      shell: isWin,
      detached: !isWin,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...(spec.server.env?.(port) ?? {}) },
    });
    let output = "";
    for (const stream of [server.stdout, server.stderr]) {
      stream?.on("data", (chunk) => {
        output = (output + chunk).slice(-6000);
      });
    }
    let up = false;
    for (let i = 0; i < 60 && !up; i++) {
      try {
        up = (await fetch(base)).ok;
      } catch {
        // not listening yet
      }
      if (!up) await sleep(1000);
    }
    check(`${name}: the server starts`, up, tail(output));
    if (!up) return;
    html = await (await fetch(base)).text();
    check(
      `${name}: the server renders the Button and the label`,
      /<button[^>]*>[^<]*Say hello/.test(html) && /<label[^>]*for="name"/.test(html),
    );
    check(`${name}: the page declares its language`, /<html[^>]*lang="en-NZ"/.test(html));
  }

  const { css, js } = await spec.assets({ app, base, html });
  check(`${name}: ships a stylesheet`, css.length > 0);
  check(
    `${name}: colour tokens switch by scheme (light-dark() or its lowered equivalent)`,
    css.includes("light-dark(") || css.includes("--lightningcss-light"),
  );
  check(
    `${name}: Tailwind generated utilities for classes the app uses`,
    /\.bg-background/.test(css),
  );
  // These classes appear only inside the package's own JavaScript, so they exist only if the
  // @source rule worked: the reader added nothing to their config.
  check(
    `${name}: Tailwind scanned @azmr/ui in node_modules (h-(--density-control-height))`,
    /\.h-\\\(--density-control-height\\\)/.test(css),
  );
  check(
    `${name}: Tailwind scanned @azmr/ui in node_modules (animate-spin)`,
    /\.animate-spin/.test(css),
  );
  if (!spec.server) {
    check(`${name}: the bundle contains the app and the Button`, js.includes("Say hello"));
    // The browser-built apps restore the saved choice from the cookie when they start.
    check(`${name}: the bundle reads the saved theme cookie`, js.includes("azmr-theme"));
  } else {
    const dark = await (
      await fetch(base, { headers: { cookie: "azmr-theme=dark; azmr-density=compact" } })
    ).text();
    check(
      `${name}: a "dark" cookie renders data-theme="dark" and data-density="compact" on <html>`,
      /<html[^>]*data-theme="dark"/.test(dark) && /<html[^>]*data-density="compact"/.test(dark),
    );
    const plain = await (await fetch(base)).text();
    check(
      `${name}: with no cookie, <html> has no data-theme (the page follows the system)`,
      !/<html[^>]*data-theme=/.test(plain),
    );
  }
  stopServer();
}

async function main() {
  log(`work dir: ${work}`);
  const tarballs = join(work, "tarballs");
  mkdirSync(tarballs);
  for (const dir of [CORE, UI]) {
    const packed = run("pnpm", ["pack", "--pack-destination", tarballs], dir);
    if (!packed.ok) throw new Error(`pnpm pack failed in ${dir}\n${tail(packed.output)}`);
  }
  const files = readdirSync(tarballs);
  const find = (prefix) => {
    const found = files.find((n) => n.startsWith(prefix) && n.endsWith(".tgz"));
    if (!found) throw new Error(`no tarball starting with ${prefix} in ${files.join(", ")}`);
    return join(tarballs, found);
  };
  const packed = { core: find("azmr-core-"), ui: find("azmr-ui-") };
  check("packed @azmr/core and @azmr/ui tarballs", true);
  for (const name of names) await verify(name, packed);
}

try {
  await main();
} catch (error) {
  failures.push("unexpected error");
  console.error(String(error?.stack ?? error));
} finally {
  cleanup();
}

if (sabotage) {
  if (failures.length > 0) {
    log(
      `\nEXPECTED FAILURE observed under --sabotage=${sabotage}:\n  - ${failures.join("\n  - ")}`,
    );
    process.exit(0);
  }
  console.error(`\nsabotage "${sabotage}" was NOT detected: the checks cannot catch this fault`);
  process.exit(1);
}
if (failures.length > 0) {
  console.error(`\nguide verification FAILED:\n  - ${failures.join("\n  - ")}`);
  process.exit(1);
}
log("\nguide verification passed");
