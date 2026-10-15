// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  createLocale,
  createTheme,
  htmlAttributes,
  serializeCookie,
  THEME_COOKIE,
  themeInitScript,
} from "./index.js";

// The theme entry is imported from Server Components, layouts and middleware, where there is
// no `window` or `document` (and no React). This runs the whole public surface in such a place.
describe("@azmr/ui/theme in a server environment", () => {
  it("really is a server environment", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
  });

  it("builds a theme", () => {
    const theme = createTheme({ primary: "#1E88E5", radius: "0.5rem", density: "compact" });
    expect(theme.css).toContain("--primary:");
    expect(theme.htmlAttributes).toEqual({ "data-density": "compact" });
  });

  it("renders <html> attributes from a cookie header, as a layout would", () => {
    expect(htmlAttributes.fromCookies("azmr-theme=dark")).toEqual({ "data-theme": "dark" });
  });

  it("serialises a cookie for a Set-Cookie header", () => {
    expect(serializeCookie(THEME_COOKIE, "light", { secure: true })).toContain("Secure");
  });

  it("formats with the default locale", () => {
    expect(createLocale().formatCurrency(5)).toBe("$5.00");
  });

  it("produces the optional init script", () => {
    expect(themeInitScript()).toContain("data-theme");
  });
});
