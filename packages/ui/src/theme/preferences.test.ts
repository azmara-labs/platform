import { describe, expect, it } from "vitest";
import {
  DENSITIES,
  DENSITY_COOKIE,
  htmlAttributes,
  parseDensity,
  parseThemePreference,
  readCookie,
  serializeCookie,
  THEME_COOKIE,
  THEME_PREFERENCES,
} from "./preferences.js";

describe("parseThemePreference", () => {
  it("accepts the three known values", () => {
    for (const value of THEME_PREFERENCES) expect(parseThemePreference(value)).toBe(value);
  });

  it("falls back to system for anything else, including hostile input", () => {
    for (const bad of [
      undefined,
      null,
      "",
      "DARK",
      "dark; Path=/",
      "<script>",
      1,
      {},
      [],
      "blue",
    ]) {
      expect(parseThemePreference(bad), String(bad)).toBe("system");
    }
  });

  it("honours an explicit fallback", () => {
    expect(parseThemePreference("nope", "light")).toBe("light");
  });
});

describe("parseDensity", () => {
  it("accepts the three known values", () => {
    for (const value of DENSITIES) expect(parseDensity(value)).toBe(value);
  });

  it("falls back to comfortable otherwise", () => {
    for (const bad of [undefined, "dense", "COMPACT", "", null, 3]) {
      expect(parseDensity(bad), String(bad)).toBe("comfortable");
    }
  });
});

describe("readCookie", () => {
  it("finds a cookie among several", () => {
    expect(readCookie("a=1; azmr-theme=dark; b=2", "azmr-theme")).toBe("dark");
  });

  it("returns undefined when absent or when the header is empty", () => {
    expect(readCookie("a=1; b=2", "azmr-theme")).toBeUndefined();
    expect(readCookie("", "azmr-theme")).toBeUndefined();
    expect(readCookie(undefined, "azmr-theme")).toBeUndefined();
    expect(readCookie(null, "azmr-theme")).toBeUndefined();
  });

  it("does not match a cookie whose name merely ends or starts the same", () => {
    expect(readCookie("x-azmr-theme=light; azmr-theme-old=light", "azmr-theme")).toBeUndefined();
  });

  it("decodes percent-encoding and tolerates malformed encoding", () => {
    expect(readCookie("k=a%20b", "k")).toBe("a b");
    expect(readCookie("k=%E0%A4%A", "k")).toBe("%E0%A4%A");
  });

  it("keeps '=' characters inside the value", () => {
    expect(readCookie("k=a=b=c", "k")).toBe("a=b=c");
  });

  it("is not fooled by regex metacharacters in the name", () => {
    expect(readCookie("a.b=1; axb=2", "a.b")).toBe("1");
  });
});

describe("serializeCookie", () => {
  it("writes a path-wide, one-year, SameSite=Lax cookie", () => {
    const cookie = serializeCookie(THEME_COOKIE, "dark");
    expect(cookie).toBe("azmr-theme=dark; Path=/; Max-Age=31536000; SameSite=Lax");
  });

  it("adds Secure when asked", () => {
    expect(serializeCookie(DENSITY_COOKIE, "compact", { secure: true })).toMatch(/; Secure$/);
  });

  it("refuses values that could break out of the cookie", () => {
    for (const bad of ["dark; Path=/evil", "a\nb", "a,b", 'a"b', "a b"]) {
      expect(() => serializeCookie(THEME_COOKIE, bad), bad).toThrow(/cookie/i);
    }
  });

  it("refuses unsafe cookie names", () => {
    expect(() => serializeCookie("bad name", "x")).toThrow(/cookie/i);
    expect(() => serializeCookie("a;b", "x")).toThrow(/cookie/i);
  });
});

describe("htmlAttributes (for <html> in a server layout)", () => {
  it("omits data-theme for system so the page follows the OS with no JavaScript", () => {
    expect(htmlAttributes({ theme: "system", density: "comfortable" })).toEqual({});
  });

  it("emits data-theme and data-density only when they differ from the defaults", () => {
    expect(htmlAttributes({ theme: "dark" })).toEqual({ "data-theme": "dark" });
    expect(htmlAttributes({ theme: "light", density: "compact" })).toEqual({
      "data-theme": "light",
      "data-density": "compact",
    });
    expect(htmlAttributes({ density: "spacious" })).toEqual({ "data-density": "spacious" });
  });

  it("builds from a cookie header, validating every value", () => {
    expect(htmlAttributes.fromCookies("azmr-theme=dark; azmr-density=compact")).toEqual({
      "data-theme": "dark",
      "data-density": "compact",
    });
    expect(htmlAttributes.fromCookies("azmr-theme=<script>; azmr-density=huge")).toEqual({});
    expect(htmlAttributes.fromCookies(undefined)).toEqual({});
  });
});
