import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockMatchMedia, renderUi, setupUser } from "../test-utils/index.js";
import { LocaleProvider, ThemeProvider, useLocale, useTheme } from "./index.js";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function clearCookies() {
  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0]?.trim();
    // biome-ignore lint/suspicious/noDocumentCookie: test cleanup of cookies set by the provider
    if (name) document.cookie = `${name}=; Path=/; Max-Age=0`;
  }
}

function resetRoot() {
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-density");
}

beforeEach(() => {
  clearCookies();
  resetRoot();
});
afterEach(() => {
  clearCookies();
  resetRoot();
});

function Probe() {
  const { theme, resolvedTheme, density, setTheme, setDensity } = useTheme();
  return (
    <div>
      <output data-testid="state">{`${theme}|${resolvedTheme}|${density}`}</output>
      <button type="button" onClick={() => setTheme("dark")}>
        dark
      </button>
      <button type="button" onClick={() => setTheme("light")}>
        light
      </button>
      <button type="button" onClick={() => setTheme("system")}>
        system
      </button>
      <button type="button" onClick={() => setDensity("compact")}>
        compact
      </button>
    </div>
  );
}

const state = (container: HTMLElement) =>
  container.querySelector("[data-testid=state]")?.textContent;
const button = (container: HTMLElement, name: string) =>
  Array.from(container.querySelectorAll("button")).find(
    (b) => b.textContent === name,
  ) as HTMLButtonElement;

describe("ThemeProvider", () => {
  it("defaults to system / comfortable and sets no attributes (CSS follows the OS)", () => {
    const mock = mockMatchMedia({ [DARK_QUERY]: false });
    const { container } = renderUi(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(state(container)).toBe("system|light|comfortable");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(document.documentElement.hasAttribute("data-density")).toBe(false);
    mock.restore();
  });

  it("applies server-provided defaults to <html>", () => {
    const mock = mockMatchMedia();
    renderUi(
      <ThemeProvider defaultTheme="dark" defaultDensity="compact">
        <Probe />
      </ThemeProvider>,
    );
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.documentElement.getAttribute("data-density")).toBe("compact");
    mock.restore();
  });

  it("setTheme updates <html>, resolvedTheme and writes the cookie", async () => {
    const mock = mockMatchMedia({ [DARK_QUERY]: false });
    const user = setupUser();
    const { container } = renderUi(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await user.click(button(container, "dark"));
    expect(state(container)).toBe("dark|dark|comfortable");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.cookie).toContain("azmr-theme=dark");

    await user.click(button(container, "system"));
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(document.cookie).toContain("azmr-theme=system");
    mock.restore();
  });

  it("setDensity updates <html> and writes the cookie", async () => {
    const mock = mockMatchMedia();
    const user = setupUser();
    const { container } = renderUi(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await user.click(button(container, "compact"));
    expect(document.documentElement.getAttribute("data-density")).toBe("compact");
    expect(document.cookie).toContain("azmr-density=compact");
    mock.restore();
  });

  it("does not write cookies until the user changes something", () => {
    const mock = mockMatchMedia();
    renderUi(
      <ThemeProvider defaultTheme="dark">
        <Probe />
      </ThemeProvider>,
    );
    expect(document.cookie).toBe("");
    mock.restore();
  });

  it("persist={false} never writes cookies", async () => {
    const mock = mockMatchMedia();
    const user = setupUser();
    const { container } = renderUi(
      <ThemeProvider persist={false}>
        <Probe />
      </ThemeProvider>,
    );
    await user.click(button(container, "dark"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.cookie).toBe("");
    mock.restore();
  });

  it("follows the operating system while on system, and stops following once forced", async () => {
    const mock = mockMatchMedia({ [DARK_QUERY]: false });
    const user = setupUser();
    const { container } = renderUi(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(state(container)).toBe("system|light|comfortable");
    act(() => mock.set(DARK_QUERY, true));
    expect(state(container)).toBe("system|dark|comfortable");
    act(() => mock.set(DARK_QUERY, false));
    expect(state(container)).toBe("system|light|comfortable");

    await user.click(button(container, "light"));
    act(() => mock.set(DARK_QUERY, true));
    expect(state(container)).toBe("light|light|comfortable");
    mock.restore();
  });

  it("removes its media-query listener on unmount", () => {
    const mock = mockMatchMedia({ [DARK_QUERY]: false });
    const { unmount } = renderUi(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(mock.listenerCount()).toBeGreaterThan(0);
    unmount();
    expect(mock.listenerCount()).toBe(0);
    mock.restore();
  });

  it("sanitises invalid defaults instead of writing them to the page", () => {
    const mock = mockMatchMedia();
    renderUi(
      <ThemeProvider defaultTheme={"blue; evil" as never} defaultDensity={"huge" as never}>
        <Probe />
      </ThemeProvider>,
    );
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(document.documentElement.hasAttribute("data-density")).toBe(false);
    mock.restore();
  });

  it("can target an element other than <html> and cleans it up", () => {
    const mock = mockMatchMedia();
    const target = document.createElement("section");
    document.body.appendChild(target);
    const { unmount } = renderUi(
      <ThemeProvider target={target} defaultTheme="dark">
        <Probe />
      </ThemeProvider>,
    );
    expect(target.getAttribute("data-theme")).toBe("dark");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    unmount();
    expect(target.hasAttribute("data-theme")).toBe(false);
    target.remove();
    mock.restore();
  });

  it("useTheme outside a provider throws a helpful error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderUi(<Probe />)).toThrow(/ThemeProvider/);
    spy.mockRestore();
  });
});

function LocaleProbe() {
  const locale = useLocale();
  return (
    <p data-testid="out">
      {locale.formatCurrency(1234.5)}|{locale.formatDate("2026-10-15")}|{locale.messages.close}
    </p>
  );
}

describe("LocaleProvider", () => {
  const out = (container: HTMLElement) => container.querySelector("[data-testid=out]")?.textContent;

  it("falls back to en-NZ without a provider", () => {
    const { container } = renderUi(<LocaleProbe />);
    expect(out(container)).toBe("$1,234.50|15 Oct 2026|Close");
  });

  it("provides the configured locale and messages", () => {
    const { container } = renderUi(
      <LocaleProvider locale="de-DE" currency="EUR" messages={{ close: "Schliessen" }}>
        <LocaleProbe />
      </LocaleProvider>,
    );
    expect(out(container)).toContain("1.234,50");
    expect(out(container)).toContain("Schliessen");
  });

  it("updates when the props change", () => {
    const { container, rerender } = renderUi(
      <LocaleProvider>
        <LocaleProbe />
      </LocaleProvider>,
    );
    expect(out(container)).toContain("$1,234.50");
    rerender(
      <LocaleProvider locale="en-US" currency="USD">
        <LocaleProbe />
      </LocaleProvider>,
    );
    expect(out(container)).toContain("$1,234.50");
    rerender(
      <LocaleProvider locale="de-DE" currency="EUR">
        <LocaleProbe />
      </LocaleProvider>,
    );
    expect(out(container)).toContain("1.234,50");
  });

  it("keeps the same Locale object across re-renders with equal props (stable context value)", () => {
    const seen: unknown[] = [];
    function Capture() {
      seen.push(useLocale());
      return null;
    }
    const { rerender } = renderUi(
      <LocaleProvider messages={{ close: "A" }}>
        <Capture />
      </LocaleProvider>,
    );
    rerender(
      <LocaleProvider messages={{ close: "A" }}>
        <Capture />
      </LocaleProvider>,
    );
    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(new Set(seen).size).toBe(1);
  });

  it("rejects an invalid locale at render time with a clear message", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      renderUi(
        <LocaleProvider locale="not a locale!!">
          <LocaleProbe />
        </LocaleProvider>,
      ),
    ).toThrow(/locale/i);
    spy.mockRestore();
  });
});
