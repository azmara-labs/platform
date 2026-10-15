// Consumer verification: packs @azmr/core and @azmr/ui into real tarballs, installs them into a
// fresh Next.js + Tailwind v4 app that lives OUTSIDE the workspace (fixtures/next-app), builds it,
// serves it, and checks the result. It exercises what unit tests cannot:
//   - a Server Component can import the server-safe entries and render the client components
//     (fails the build if "use client" is missing or misplaced);
//   - Tailwind v4 scans the package's classes inside node_modules (the @source rule);
//   - the server renders data-theme / data-density from cookies;
//   - the package's exports map resolves from a real install.
//
// Usage:  node scripts/verify-consumer.mjs [--keep] [--sabotage=no-source|no-client-directive]
// Requires the packages to be built first (pnpm build). With --sabotage the run MUST fail in the
// expected place; the script exits 0 only when it does, proving the check can detect that fault.
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
const FIXTURE = join(UI, "fixtures", "next-app");
const PORT = Number(process.env.FIXTURE_PORT ?? 4173);
const BASE = `http://127.0.0.1:${PORT}`;
const keep = process.argv.includes("--keep");
const sabotage = process.argv.find((a) => a.startsWith("--sabotage="))?.split("=")[1];
const isWin = process.platform === "win32";

const log = (msg) => console.log(msg);
const failures = [];
const check = (name, ok, detail = "") => {
  log(`${ok ? "  ok  " : "  FAIL"} ${name}${ok || !detail ? "" : `\n         ${detail}`}`);
  if (!ok) failures.push(name);
};

function run(command, args, cwd, label) {
  const result = spawnSync(command, args, {
    cwd,
    shell: isWin,
    encoding: "utf8",
    env: { ...process.env, CI: "1", NEXT_TELEMETRY_DISABLED: "1" },
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return { ok: result.status === 0, output, label };
}
const tail = (text, lines = 40) => text.trim().split("\n").slice(-lines).join("\n");

for (const dir of [UI, CORE]) {
  if (!existsSync(join(dir, "dist"))) {
    console.error(`dist/ missing in ${dir}: run "pnpm build" first`);
    process.exit(2);
  }
}

const work = mkdtempSync(join(tmpdir(), "azmr-ui-consumer-"));
let server;
const cleanup = () => {
  if (server?.pid) {
    if (isWin) spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    else {
      try {
        process.kill(-server.pid, "SIGTERM");
      } catch {}
    }
  }
  if (!keep) rmSync(work, { recursive: true, force: true });
  else log(`kept: ${work}`);
};

async function main() {
  log(`work dir: ${work}`);

  // 1. Pack the real publishable tarballs.
  const tarballs = join(work, "tarballs");
  mkdirSync(tarballs);
  for (const dir of [CORE, UI]) {
    const packed = run("pnpm", ["pack", "--pack-destination", tarballs], dir, "pack");
    if (!packed.ok) throw new Error(`pnpm pack failed in ${dir}\n${tail(packed.output)}`);
  }
  const files = readdirSync(tarballs);
  const find = (prefix) => {
    const f = files.find((n) => n.startsWith(prefix) && n.endsWith(".tgz"));
    if (!f) throw new Error(`no tarball starting with ${prefix} in ${files.join(", ")}`);
    return join(tarballs, f);
  };
  const coreTgz = find("azmr-core-");
  const uiTgz = find("azmr-ui-");
  check("packed @azmr/core and @azmr/ui tarballs", true);

  // 2. Copy the fixture and point it at the tarballs.
  const app = join(work, "app");
  cpSync(FIXTURE, app, {
    recursive: true,
    filter: (src) => !/[\\/](node_modules|\.next)([\\/]|$)/.test(src),
  });
  const pkgPath = join(app, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.dependencies["@azmr/core"] = `file:${coreTgz.replaceAll("\\", "/")}`;
  pkg.dependencies["@azmr/ui"] = `file:${uiTgz.replaceAll("\\", "/")}`;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

  // 3. Install outside the workspace. Copy (not hard-link) so sabotage can never touch the pnpm store.
  const install = run(
    "pnpm",
    [
      "install",
      "--ignore-workspace",
      "--no-frozen-lockfile",
      "--config.package-import-method=copy",
    ],
    app,
    "install",
  );
  if (!install.ok) throw new Error(`install failed\n${tail(install.output)}`);
  check("installed the fixture with the packed packages", true);

  // Two copies of @azmr/core: Signal has private members, so types from two copies are nominally
  // incompatible and a Signal from the app cannot be passed to useSignal. The peerDependency exists
  // to prevent this; prove the failure is real (and detectable) with a positive control first.
  const installedUi = join(app, "node_modules", "@azmr", "ui");
  const dupFile = join(app, "dup-check.ts");
  writeFileSync(
    dupFile,
    [
      'import { Signal } from "@azmr/core";',
      'import { useSignal } from "@azmr/ui/hooks";',
      "export const read = (s: Signal<number>) => useSignal(s);",
      "",
    ].join("\n"),
  );
  const tscArgs = [
    "exec",
    "tsc",
    "--noEmit",
    "--strict",
    "--skipLibCheck",
    "--module",
    "esnext",
    "--moduleResolution",
    "bundler",
    "--target",
    "es2022",
    "--jsx",
    "react-jsx",
    "dup-check.ts",
  ];
  const single = run("pnpm", tscArgs, app, "tsc-single");
  check(
    "one copy of @azmr/core: a Signal passes to useSignal (type-checks)",
    single.ok,
    single.ok ? "" : tail(single.output),
  );
  const nested = join(installedUi, "node_modules", "@azmr", "core");
  cpSync(join(app, "node_modules", "@azmr", "core"), nested, {
    recursive: true,
    dereference: true,
  });
  // TypeScript treats copies with the same name@version as one package, so the duplicate must differ
  // in version, which is how it happens in real apps (a range the peer does not unify).
  const nestedPkgPath = join(nested, "package.json");
  const nestedPkg = JSON.parse(readFileSync(nestedPkgPath, "utf8"));
  writeFileSync(
    nestedPkgPath,
    JSON.stringify({ ...nestedPkg, version: `${nestedPkg.version}-dup` }),
  );
  const doubled = run("pnpm", tscArgs, app, "tsc-double");
  check(
    "two copies of @azmr/core are a type error (the failure the peerDependency prevents)",
    !doubled.ok && /private propert/.test(doubled.output),
    doubled.ok ? "tsc unexpectedly passed with two copies" : tail(doubled.output, 12),
  );
  rmSync(join(installedUi, "node_modules"), { recursive: true, force: true });
  rmSync(dupFile, { force: true });

  // Optional fault injection (proves the checks below can actually fail).
  if (sabotage === "no-source") {
    const css = join(installedUi, "dist", "styles.css");
    writeFileSync(css, readFileSync(css, "utf8").replace(/@source[^;]*;/, ""));
    log("SABOTAGE: removed the @source rule from the installed styles.css");
  }
  if (sabotage === "no-client-directive") {
    const js = join(installedUi, "dist", "react.js");
    writeFileSync(js, readFileSync(js, "utf8").replace(/^\s*"use client";?/, ""));
    log(
      'SABOTAGE: removed "use client" from the installed react.js (createContext inside a Server Component layout)',
    );
  }

  // 4. Build: fails if a Server Component cannot import the package.
  const build = run("pnpm", ["exec", "next", "build"], app, "build");
  check(
    "next build succeeds (Server Components import the packed package)",
    build.ok,
    build.ok ? "" : tail(build.output),
  );
  if (!build.ok) return;

  // 5. Serve and inspect.
  server = spawn("pnpm", ["exec", "next", "start", "-p", String(PORT)], {
    cwd: app,
    shell: isWin,
    detached: !isWin,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverOutput = "";
  for (const stream of [server.stdout, server.stderr]) {
    stream?.on("data", (chunk) => {
      serverOutput = (serverOutput + chunk).slice(-8000);
    });
  }
  let up = false;
  for (let i = 0; i < 60 && !up; i++) {
    try {
      up = (await fetch(BASE)).ok;
    } catch {
      // not listening yet
    }
    if (!up) await sleep(1000);
  }
  check("server started", up, up ? "" : tail(serverOutput));
  if (!up) return;

  const html = await (await fetch(BASE)).text();
  check(
    "renders the client components (button, input, spinner)",
    /<button[^>]*type="button"/.test(html) &&
      /<input[^>]*id="name"/.test(html) &&
      /<svg/.test(html),
  );
  check("loading button is busy in the server HTML", /aria-busy="true"/.test(html));
  check("server-safe theme entry formats NZ currency on the server", html.includes("$1,234.50"));
  check(
    "no data-theme on <html> by default (system follows the OS with no JavaScript)",
    !/<html[^>]*data-theme=/.test(html),
  );

  const dark = await (
    await fetch(BASE, { headers: { cookie: "azmr-theme=dark; azmr-density=compact" } })
  ).text();
  check(
    'cookie "dark" renders data-theme="dark" on <html> from the server',
    /<html[^>]*data-theme="dark"/.test(dark),
  );
  check(
    'cookie "compact" renders data-density="compact" on <html>',
    /<html[^>]*data-density="compact"/.test(dark),
  );
  const hostile = await (
    await fetch(BASE, {
      headers: { cookie: 'azmr-theme="><script>alert(1)</script>; azmr-density=huge' },
    })
  ).text();
  check(
    "hostile cookie values are ignored, not reflected",
    !hostile.includes("alert(1)") && !/<html[^>]*data-(theme|density)=/.test(hostile),
  );

  const sheets = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map(
    (m) => m[1],
  );
  let css = "";
  for (const href of sheets) css += await (await fetch(new URL(href, BASE))).text();
  check("page ships a stylesheet", sheets.length > 0 && css.length > 0);
  // Next's CSS pipeline may keep `light-dark()` or lower it to `var(--lightningcss-light, …)` toggles for
  // its browser targets. Both are valid; what matters is that colours switch by scheme.
  check(
    "colour tokens switch by scheme (light-dark() or its lowered equivalent)",
    css.includes("light-dark(") || css.includes("--lightningcss-light"),
  );
  check(
    "explicit theme overrides survive ([data-theme=dark] and [data-theme=light])",
    /\[data-theme=["']?dark["']?\]/.test(css) && /\[data-theme=["']?light["']?\]/.test(css),
  );
  check(
    "density and motion tokens are present",
    css.includes("--density-control-height") &&
      css.includes("[data-density=compact]") &&
      css.includes("--motion-duration-base"),
  );
  check("Tailwind generated utilities for classes used by the APP", /\.bg-background/.test(css));
  // These classes appear ONLY inside the package's dist JS, so they exist only if @source worked.
  check(
    "Tailwind scanned @azmr/ui in node_modules (h-(--density-control-height))",
    /\.h-\\\(--density-control-height\\\)/.test(css),
  );
  check("Tailwind scanned @azmr/ui in node_modules (animate-spin)", /\.animate-spin/.test(css));
  check(
    "Tailwind scanned @azmr/ui in node_modules (focus-visible:ring-ring)",
    /focus-visible\\:ring-ring/.test(css),
  );

  const signal = await fetch(`${BASE}/signal`);
  const signalHtml = await signal.text();
  check(
    "a client page using @azmr/core + @azmr/ui/hooks renders",
    signal.ok && signalHtml.includes('data-testid="count"'),
  );
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
  console.error(`\nconsumer verification FAILED:\n  - ${failures.join("\n  - ")}`);
  process.exit(1);
}
log("\nconsumer verification passed");
