import { parse, rgb, wcagContrast } from "culori";
import { describe, expect, it } from "vitest";
import { checkContrast, NON_TEXT_PAIRS, TEXT_PAIRS, type ThemeIssue } from "./contrast.js";
import { type Mode, ROLE_DEFAULTS, ROLES, type Role } from "./roles.js";

type Resolved = Map<Role, Record<Mode, string>>;

const defaults = (): Resolved =>
  new Map(ROLES.map((role) => [role, { ...ROLE_DEFAULTS[role] }] as const));

function with_(changes: Partial<Record<Role, Partial<Record<Mode, string>>>>): Resolved {
  const map = defaults();
  for (const [role, modes] of Object.entries(changes) as [Role, Partial<Record<Mode, string>>][]) {
    map.set(role, { ...(map.get(role) as Record<Mode, string>), ...modes });
  }
  return map;
}

const find = (issues: ThemeIssue[], role: Role, against: Role, mode: Mode) =>
  issues.find((i) => i.role === role && i.against === against && i.mode === mode);

const ratio = (a: string, b: string) => {
  const [ca, cb] = [parse(a), parse(b)];
  if (!ca || !cb) throw new Error(`unparseable: ${a} / ${b}`);
  return wcagContrast(ca, cb);
};

describe("the pair tables", () => {
  it("guards against checking nothing", () => {
    expect(TEXT_PAIRS.length).toBeGreaterThanOrEqual(23);
    expect(NON_TEXT_PAIRS.length).toBeGreaterThanOrEqual(4);
  });

  it("includes the pairs the token tests treat as the baseline", () => {
    const has = (pairs: readonly (readonly [Role, Role])[], fg: Role, bg: Role) =>
      pairs.some(([a, b]) => a === fg && b === bg);
    expect(has(TEXT_PAIRS, "foreground", "background")).toBe(true);
    expect(has(TEXT_PAIRS, "sidebar-accent-foreground", "sidebar-accent")).toBe(true);
    expect(has(TEXT_PAIRS, "destructive", "card")).toBe(true);
    expect(has(TEXT_PAIRS, "warning-text", "background")).toBe(true);
    expect(has(NON_TEXT_PAIRS, "ring", "background")).toBe(true);
  });
});

describe("checkContrast", () => {
  it("passes for the default tokens in both modes", () => {
    expect(checkContrast(defaults())).toEqual([]);
  });

  it("reports a failing pair with role, mode, measured and required ratios", () => {
    const issues = checkContrast(with_({ foreground: { light: "oklch(1 0 0)" } }));
    const issue = find(issues, "foreground", "background", "light");
    expect(issue).toBeDefined();
    expect(issue?.required).toBe(4.5);
    expect(issue?.ratio).toBeCloseTo(1, 1);
    expect(issue?.message).toBe("foreground on background (light): 1.00:1, needs 4.5:1");
  });

  it("reports every failing pair, not just the first", () => {
    const issues = checkContrast(
      with_({
        foreground: { light: "oklch(1 0 0)", dark: "oklch(0.145 0 0)" },
        "muted-foreground": { light: "oklch(0.97 0 0)" },
      }),
    );
    expect(find(issues, "foreground", "background", "light")).toBeDefined();
    expect(find(issues, "foreground", "background", "dark")).toBeDefined();
    expect(find(issues, "muted-foreground", "muted", "light")).toBeDefined();
    expect(find(issues, "muted-foreground", "background", "light")).toBeDefined();
    expect(issues.length).toBeGreaterThanOrEqual(4);
  });

  it("skips pairs involving transparent colours without throwing", () => {
    let issues: ThemeIssue[] = [];
    expect(() => {
      issues = checkContrast(with_({ foreground: { light: "oklch(0 0 0 / 0.5)" } }));
    }).not.toThrow();
    expect(find(issues, "foreground", "background", "light")).toBeUndefined();
  });

  it("uses 3:1 for the ring and 4.5:1 for text", () => {
    const muted = "oklch(0.56 0 0)";
    const ring = "oklch(0.62 0 0)";
    // Preconditions, from the independent oracle: both sit between 3 and 4.5.
    expect(ratio(muted, "oklch(0.97 0 0)")).toBeGreaterThan(3);
    expect(ratio(muted, "oklch(0.97 0 0)")).toBeLessThan(4.5);
    expect(ratio(ring, "oklch(1 0 0)")).toBeGreaterThan(3);
    expect(ratio(ring, "oklch(1 0 0)")).toBeLessThan(4.5);

    const issues = checkContrast(
      with_({ "muted-foreground": { light: muted }, ring: { light: ring } }),
    );
    expect(find(issues, "muted-foreground", "muted", "light")?.required).toBe(4.5);
    expect(issues.some((i) => i.role === "ring")).toBe(false);

    const failing = checkContrast(with_({ ring: { light: "oklch(0.9 0 0)" } }));
    expect(find(failing, "ring", "background", "light")?.required).toBe(3);
  });

  it("agrees with an independent oracle on which side of 4.5:1 a colour falls", () => {
    for (let l = 0.5; l <= 0.6; l += 0.005) {
      const value = `oklch(${l.toFixed(3)} 0 0)`;
      const expected = ratio(value, "oklch(0.97 0 0)") < 4.5;
      const issues = checkContrast(with_({ "muted-foreground": { light: value } }));
      const reported = find(issues, "muted-foreground", "muted", "light") !== undefined;
      expect(reported, `L=${l.toFixed(3)}`).toBe(expected);
    }
  });

  it("ignores roles that are missing from the map instead of throwing", () => {
    const partial: Resolved = new Map([
      ["foreground", { light: "oklch(0 0 0)", dark: "oklch(1 0 0)" }],
    ]);
    expect(checkContrast(partial)).toEqual([]);
  });
});

// A solid button blends with the surface behind it on hover (primary, status 90%, secondary 80%),
// so a label that passes at rest can fail under the pointer. The oracle mixes in gamma-encoded
// sRGB with culori, independent of the code under test.
describe("hover blend", () => {
  const grey = (l: number) => `oklch(${l.toFixed(3)} 0 0)`;

  function hoverRatio(fg: string, bg: string, surface: string, alpha: number) {
    const [f, b, s] = [rgb(parse(fg)), rgb(parse(bg)), rgb(parse(surface))];
    if (!f || !b || !s) throw new Error("unparseable");
    const mixed = {
      mode: "rgb" as const,
      r: b.r * alpha + s.r * (1 - alpha),
      g: b.g * alpha + s.g * (1 - alpha),
      b: b.b * alpha + s.b * (1 - alpha),
    };
    return wcagContrast(f, mixed);
  }

  it("reports a label that passes at rest but fails on hover", () => {
    // Light mode: the default primary-foreground is near white, the page is white.
    const fg = ROLE_DEFAULTS["primary-foreground"].light;
    let found: number | undefined;
    for (let l = 0.5; l <= 0.62; l += 0.002) {
      const rest = ratio(fg, grey(l));
      const hover = hoverRatio(fg, grey(l), ROLE_DEFAULTS.background.light, 0.9);
      if (rest >= 4.55 && hover <= 4.45) {
        found = l;
        break;
      }
    }
    expect(found, "a grey that passes at rest and fails on hover exists").toBeDefined();

    const issues = checkContrast(with_({ primary: { light: grey(found as number) } }));
    expect(
      issues.some(
        (i) =>
          i.role === "primary-foreground" &&
          i.against === "primary" &&
          i.mode === "light" &&
          i.hover === undefined,
      ),
      "the label is fine at rest",
    ).toBe(false);
    const issue = issues.find(
      (i) => i.role === "primary-foreground" && i.mode === "light" && i.hover === "background",
    );
    expect(issue?.required).toBe(4.5);
    expect(issue?.ratio).toBeLessThan(4.5);
    expect(issue?.message).toMatch(
      /^primary-foreground on primary \(light, hovering over background\): \d\.\d\d:1, needs 4\.5:1$/,
    );
  });

  it("agrees with the oracle about hover, over the page and over the card, in both modes", () => {
    const cases: [Role, Role, number][] = [
      ["primary-foreground", "primary", 0.9],
      ["secondary-foreground", "secondary", 0.8],
      ["destructive-foreground", "destructive", 0.9],
      ["success-foreground", "success", 0.9],
      ["warning-foreground", "warning", 0.9],
      ["info-foreground", "info", 0.9],
    ];
    let compared = 0;
    for (const [fgRole, bgRole, alpha] of cases) {
      for (const mode of ["light", "dark"] as const) {
        for (let l = 0.3; l <= 0.9; l += 0.02) {
          const map = with_({ [bgRole]: { [mode]: grey(l) } });
          const issues = checkContrast(map);
          for (const surface of ["background", "card"] as const) {
            const expected = hoverRatio(
              ROLE_DEFAULTS[fgRole][mode],
              grey(l),
              ROLE_DEFAULTS[surface][mode],
              alpha,
            );
            if (Math.abs(expected - 4.5) < 0.03) continue; // too close to call between two implementations
            const reported = issues.some(
              (i) => i.role === fgRole && i.mode === mode && i.hover === surface,
            );
            expect(
              reported,
              `${fgRole} on ${bgRole} ${mode} L=${l.toFixed(2)} over ${surface}`,
            ).toBe(expected < 4.5);
            compared++;
          }
        }
      }
    }
    expect(compared).toBeGreaterThan(300);
  });

  it("leaves the default tokens clean", () => {
    expect(checkContrast(defaults()).filter((i) => i.hover !== undefined)).toEqual([]);
  });
});
