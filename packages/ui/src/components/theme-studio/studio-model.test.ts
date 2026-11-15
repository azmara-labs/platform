import { describe, expect, it } from "vitest";
import { createTheme, type ThemeConfig, validateTheme } from "../../theme/index.js";
import { DEFAULT_MESSAGES, fill } from "./messages.js";
import {
  draftFromConfig,
  evaluateDraft,
  isDirty,
  type StudioDraft,
  type StudioResult,
} from "./studio-model.js";

const LOGO = "data:image/webp;base64,QUJD";
const LOGO_DARK = "data:image/webp;base64,REVG";
const FAVICON = "https://harbourandpine.example/favicon.png";

/** What a developer might have set that the studio never shows. */
const HIDDEN: ThemeConfig = {
  version: 1,
  name: "Harbour & Pine",
  brand: "#1d4ed8",
  secondary: "#0f766e",
  radius: "0.75rem",
  font: 'Inter, "Segoe UI", sans-serif',
  density: "compact",
  tint: 0.01,
  light: { "primary-foreground": "#ffffff" },
  dark: { ring: "#93c5fd" },
  branding: { appName: "Harbour & Pine", logo: LOGO, favicon: FAVICON },
};

const draftOf = (over: Partial<StudioDraft> = {}, config?: ThemeConfig): StudioDraft => ({
  ...draftFromConfig(config),
  ...over,
});

function ok(result: StudioResult) {
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result)}`);
  return result;
}
function bad(result: StudioResult) {
  if (result.ok) throw new Error("expected a failure");
  return result;
}

describe("draftFromConfig", () => {
  it("reads brand, brandDark, appName and both logos", () => {
    expect(
      draftFromConfig({
        brand: "#112233",
        brandDark: "#445566",
        branding: { appName: "Harbour", logo: LOGO, logoDark: LOGO_DARK },
      }),
    ).toEqual({
      appName: "Harbour",
      brand: "#112233",
      brandDark: "#445566",
      logo: LOGO,
      logoDark: LOGO_DARK,
    });
  });

  it("reads the primary alias when there is no brand", () => {
    expect(draftFromConfig({ primary: "#112233" }).brand).toBe("#112233");
  });

  it("gives empty strings for a missing config", () => {
    expect(draftFromConfig()).toEqual({
      appName: "",
      brand: "",
      brandDark: "",
      logo: "",
      logoDark: "",
    });
  });
});

describe("evaluateDraft: what is kept and what is removed", () => {
  it("a fixture with every hidden setting is itself valid", () => {
    expect(validateTheme(HIDDEN)).toEqual([]);
  });

  it("a config with every hidden setting survives unchanged", () => {
    const result = ok(
      evaluateDraft(HIDDEN, draftOf({ appName: "Pine & Harbour", brand: "#0e7490" }, HIDDEN)),
    );
    expect(result.config).toEqual({
      ...HIDDEN,
      brand: "#0e7490",
      branding: { ...HIDDEN.branding, appName: "Pine & Harbour" },
    });
  });

  it("does not change the config it was given", () => {
    const copy = structuredClone(HIDDEN);
    evaluateDraft(HIDDEN, draftOf({ brand: "#0e7490", logo: "" }, HIDDEN));
    expect(HIDDEN).toEqual(copy);
  });

  it("writes back to primary when the config used the primary alias", () => {
    const base: ThemeConfig = { version: 1, primary: "#1d4ed8" };
    const result = ok(evaluateDraft(base, draftOf({ brand: "#0e7490" }, base)));
    expect(result.config).toEqual({ version: 1, primary: "#0e7490" });
  });

  it("adds version 1 only when it was missing and the output is not empty", () => {
    expect(ok(evaluateDraft(undefined, draftOf({ brand: "#1d4ed8" }))).config).toEqual({
      version: 1,
      brand: "#1d4ed8",
    });
    expect(ok(evaluateDraft(undefined, draftOf())).config).toEqual({});
  });

  it("clearing the dark colour and dark logo removes brandDark and logoDark", () => {
    const base: ThemeConfig = {
      version: 1,
      brand: "#1d4ed8",
      brandDark: "#93c5fd",
      branding: { appName: "Harbour", logo: LOGO, logoDark: LOGO_DARK },
    };
    const { config } = ok(evaluateDraft(base, draftOf({ brandDark: "", logoDark: "" }, base)));
    expect(config).toEqual({
      version: 1,
      brand: "#1d4ed8",
      branding: { appName: "Harbour", logo: LOGO },
    });
    expect(JSON.stringify(config)).not.toContain('""');
  });

  it("removes branding when it ends up empty, but keeps it with a favicon", () => {
    const base: ThemeConfig = { version: 1, branding: { appName: "Harbour" } };
    expect(ok(evaluateDraft(base, draftOf({ appName: "" }, base))).config).toEqual({ version: 1 });
    const withIcon: ThemeConfig = {
      version: 1,
      branding: { appName: "Harbour", favicon: FAVICON },
    };
    expect(ok(evaluateDraft(withIcon, draftOf({ appName: "" }, withIcon))).config).toEqual({
      version: 1,
      branding: { favicon: FAVICON },
    });
  });

  it("trims names and colours and accepts #ABC and upper case", () => {
    const { config } = ok(
      evaluateDraft(undefined, draftOf({ appName: "  Harbour  ", brand: " #ABC " })),
    );
    expect(config.branding?.appName).toBe("Harbour");
    expect(config.brand).toBe("#ABC");
    expect(validateTheme(config)).toEqual([]);
  });
});

describe("evaluateDraft: field errors", () => {
  it("a whitespace-only name is treated as empty", () => {
    const { config } = ok(evaluateDraft(undefined, draftOf({ appName: "   ", brand: "#1d4ed8" })));
    expect(config.branding).toBeUndefined();
  });

  it("refuses an 81 character name and a name with a control character", () => {
    expect(bad(evaluateDraft(undefined, draftOf({ appName: "a".repeat(81) }))).errors.appName).toBe(
      DEFAULT_MESSAGES.errorAppName,
    );
    expect(
      bad(evaluateDraft(undefined, draftOf({ appName: "Har\u0007bour" }))).errors.appName,
    ).toBe(DEFAULT_MESSAGES.errorAppName);
    expect(ok(evaluateDraft(undefined, draftOf({ appName: "a".repeat(80) }))).config).toBeDefined();
  });

  it.each(["#12", "red", "oklch(2 0 0)", "#12345g"])("refuses %s as the light colour", (text) => {
    const result = bad(evaluateDraft(undefined, draftOf({ brand: text })));
    expect(result.errors.brand).toBe(
      fill(DEFAULT_MESSAGES.errorColour, { field: DEFAULT_MESSAGES.lightColourName }),
    );
    expect(result.conflict).toBeUndefined();
  });

  it("refuses a bad dark colour naming the dark colour", () => {
    const result = bad(evaluateDraft(undefined, draftOf({ brand: "#1d4ed8", brandDark: "nope" })));
    expect(result.errors.brandDark).toBe(
      fill(DEFAULT_MESSAGES.errorColour, { field: DEFAULT_MESSAGES.darkColourName }),
    );
    expect(result.errors.brand).toBeUndefined();
  });

  it("refuses a dark colour with no light colour", () => {
    expect(bad(evaluateDraft(undefined, draftOf({ brandDark: "#93c5fd" }))).errors.brandDark).toBe(
      DEFAULT_MESSAGES.errorDarkNeedsLight,
    );
  });

  it("uses the messages it is given", () => {
    const result = bad(
      evaluateDraft(undefined, draftOf({ appName: "a".repeat(81) }), {
        ...DEFAULT_MESSAGES,
        errorAppName: "Kia ora",
      }),
    );
    expect(result.errors.appName).toBe("Kia ora");
  });
});

describe("evaluateDraft: the note under each colour", () => {
  it("createTheme writes light-dark(a, b) for --primary and --primary-text", () => {
    const { cssVariables } = createTheme({ brand: "#1d4ed8" });
    for (const role of ["--primary", "--primary-text"]) {
      expect(cssVariables[role]).toMatch(/^light-dark\(oklch\([^,)]+\), oklch\([^,)]+\)\)$/);
    }
  });

  it("a colour that is used as it is reads readable in light", () => {
    const result = ok(evaluateDraft(undefined, draftOf({ brand: "#1d4ed8" })));
    expect(result.notes.find((n) => n.mode === "light")?.kind).toBe("readable");
  });

  it("a pale colour reads adjusted and quotes the library's primary-text shade as hex", () => {
    const result = ok(evaluateDraft(undefined, draftOf({ brand: "#ffff99" })));
    const note = result.notes.find((n) => n.mode === "light");
    expect(note?.kind).toBe("adjusted");
    expect(note?.shade).toMatch(/^#[0-9a-f]{6}$/);
    // The library's own darker text shade, not the pale colour that was typed.
    expect(note?.shade).not.toBe("#ffff99");
    expect(result.cssVariables["--primary-text"]).toContain("oklch(0.548 0.116 108.5)");
    expect(note?.shade).toBe("#777508");
  });

  it("an empty dark colour gives a dark-derived note and a set one gives its own", () => {
    const derived = ok(evaluateDraft(undefined, draftOf({ brand: "#1d4ed8" })));
    expect(derived.notes.find((n) => n.mode === "dark")?.kind).toBe("dark-derived");
    const own = ok(evaluateDraft(undefined, draftOf({ brand: "#1d4ed8", brandDark: "#93c5fd" })));
    expect(own.notes.find((n) => n.mode === "dark")?.kind).not.toBe("dark-derived");
  });

  it("no brand colour gives no notes", () => {
    expect(ok(evaluateDraft(undefined, draftOf({ appName: "Harbour" }))).notes).toEqual([]);
  });
});

describe("evaluateDraft: conflicts with settings the admin cannot see", () => {
  const BASE: ThemeConfig = {
    version: 1,
    brand: "#1d4ed8",
    light: { "primary-foreground": "#ffffff" },
  };

  it("a hidden override that fails contrast with the new colour blocks and is kept", () => {
    expect(validateTheme(BASE)).toEqual([]);
    expect(validateTheme({ ...BASE, brand: "#ffee00" }).length).toBeGreaterThan(0);
    const result = bad(evaluateDraft(BASE, draftOf({ brand: "#ffee00" }, BASE)));
    expect(result.errors).toEqual({});
    expect(result.conflict?.roles).toContain("primary-foreground");
    expect(result.conflict?.issues.join(" ")).toContain("primary-foreground on primary (light)");
    // The override is still what the base says: nothing was dropped or edited to get past it.
    expect(BASE.light).toEqual({ "primary-foreground": "#ffffff" });
  });

  it("an incoming config that already fails is blocked the same way", () => {
    const failing: ThemeConfig = { ...BASE, brand: "#ffee00" };
    const result = bad(evaluateDraft(failing, draftOf({}, failing)));
    expect(result.conflict?.roles).toContain("primary-foreground");
  });

  it("an incoming config the parser refuses is a conflict with no role", () => {
    const broken = { version: 1, radius: "big" } as ThemeConfig;
    const result = bad(evaluateDraft(broken, draftOf({ appName: "Harbour" }, broken)));
    expect(result.conflict?.roles).toEqual([]);
    expect(result.conflict?.issues.join(" ")).toContain("radius");
  });

  it("a pale yellow with no overrides is adjusted, not blocked", () => {
    const result = ok(evaluateDraft(undefined, draftOf({ brand: "#ffee00" })));
    expect(validateTheme(result.config)).toEqual([]);
  });
});

describe("isDirty", () => {
  it("is false for the draft read from the config and true after any field changes", () => {
    const draft = draftFromConfig(HIDDEN);
    expect(isDirty(HIDDEN, draft)).toBe(false);
    expect(isDirty(HIDDEN, { ...draft, appName: `${draft.appName} 2` })).toBe(true);
    expect(isDirty(HIDDEN, { ...draft, brandDark: "#93c5fd" })).toBe(true);
    expect(isDirty(HIDDEN, { ...draft, logo: "" })).toBe(true);
    expect(isDirty(HIDDEN, { ...draft, appName: `${draft.appName}  ` })).toBe(false);
  });
});
