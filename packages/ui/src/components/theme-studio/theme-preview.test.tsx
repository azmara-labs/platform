import { afterEach, describe, expect, it } from "vitest";
import { expectNoA11yViolations, renderServer, renderUi } from "../../test-utils/index.js";
import { createTheme, ROLES } from "../../theme/index.js";
import { ThemePreview } from "./theme-preview.js";

const LOGO = "data:image/webp;base64,QUJD";
const LOGO_DARK = "data:image/webp;base64,REVG";
const { cssVariables } = createTheme({ brand: "#1d4ed8" });
const root = (c: HTMLElement) => c.querySelector('[data-slot="theme-preview"]') as HTMLElement;
const img = (c: HTMLElement) => c.querySelector("img");

afterEach(() => {
  document.documentElement.removeAttribute("style");
});

describe("ThemePreview", () => {
  it("sets the theme variables on its own container only", () => {
    const { container } = renderUi(<ThemePreview cssVariables={cssVariables} mode="light" />);
    expect(root(container).style.getPropertyValue("--primary")).toBe(cssVariables["--primary"]);
    expect(document.documentElement.getAttribute("style")).toBeNull();
    expect(document.body.getAttribute("style")).toBeNull();
  });

  it("sets color-scheme from the mode, on the container", () => {
    const light = renderServer(<ThemePreview cssVariables={cssVariables} mode="light" />);
    const dark = renderServer(<ThemePreview cssVariables={cssVariables} mode="dark" />);
    expect(light).toContain("color-scheme:light");
    expect(dark).toContain("color-scheme:dark");
  });

  it("uses logoDark in dark and falls back to logo", () => {
    const both = { cssVariables, logo: LOGO, logoDark: LOGO_DARK };
    expect(
      img(renderUi(<ThemePreview {...both} mode="dark" />).container)?.getAttribute("src"),
    ).toBe(LOGO_DARK);
    expect(
      img(renderUi(<ThemePreview {...both} mode="light" />).container)?.getAttribute("src"),
    ).toBe(LOGO);
    const only = { cssVariables, logo: LOGO };
    expect(
      img(renderUi(<ThemePreview {...only} mode="dark" />).container)?.getAttribute("src"),
    ).toBe(LOGO);
  });

  it.each([
    "javascript:alert(1)",
    "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
    "http://example.com/logo.png",
  ])("renders no img for %s", (logo) => {
    const { container } = renderUi(
      <ThemePreview cssVariables={cssVariables} mode="light" logo={logo} />,
    );
    expect(img(container)).toBeNull();
  });

  it("renders an img for an https URL", () => {
    const { container } = renderUi(
      <ThemePreview
        cssVariables={cssVariables}
        mode="light"
        logo="https://harbourandpine.example/l.png"
      />,
    );
    expect(img(container)).not.toBeNull();
  });

  it("shows the app name, or a placeholder when there is none", () => {
    const named = renderUi(
      <ThemePreview cssVariables={cssVariables} mode="light" appName="Harbour & Pine" />,
    );
    expect(named.container.textContent).toContain("Harbour & Pine");
    const bare = renderUi(<ThemePreview cssVariables={cssVariables} mode="light" />);
    expect(bare.container.textContent).toContain("Your app name");
  });

  it("the sample is inert and aria-hidden, with a hidden sentence that describes it", () => {
    const { container } = renderUi(<ThemePreview cssVariables={cssVariables} mode="dark" />);
    const sample = container.querySelector("[inert]") as HTMLElement;
    expect(sample.getAttribute("aria-hidden")).toBe("true");
    const description = container.querySelector(".sr-only") as HTMLElement;
    expect(description.textContent).toBe(
      "Preview of the dark theme: a header with your logo and app name, a card, a link and a button.",
    );
    // The description is outside the hidden sample, so it is read.
    expect(sample.contains(description)).toBe(false);
  });

  it("uses the messages it is given", () => {
    const { container } = renderUi(
      <ThemePreview
        cssVariables={cssVariables}
        mode="light"
        messages={{ previewButton: "Kōwhiri", modeLight: "Ao" }}
      />,
    );
    expect(container.textContent).toContain("Kōwhiri");
  });

  it.each(["light", "dark"] as const)("has no axe violations in %s", async (mode) => {
    const { container } = renderUi(
      <ThemePreview cssVariables={cssVariables} mode={mode} appName="Harbour & Pine" logo={LOGO} />,
    );
    await expectNoA11yViolations(container);
  });
});

describe("ThemePreview: isolation from the page's theme", () => {
  it("sets every colour role, so the page's own theme never shows through", () => {
    document.documentElement.style.setProperty("--primary", "light-dark(red, red)");
    const { container } = renderUi(<ThemePreview cssVariables={{}} mode="light" />);
    const style = root(container).style;
    for (const role of ROLES) expect(style.getPropertyValue(`--${role}`)).toMatch(/^light-dark\(/);
    expect(style.getPropertyValue("--primary")).not.toContain("red");
  });

  it("the theme's own values win over the defaults", () => {
    const { container } = renderUi(<ThemePreview cssVariables={cssVariables} mode="dark" />);
    expect(root(container).style.getPropertyValue("--primary")).toBe(cssVariables["--primary"]);
  });
});

describe("ThemePreview: only custom properties are applied", () => {
  it("ignores any key that is not a --variable", () => {
    const hostile = {
      "--primary": "light-dark(red, red)",
      position: "fixed",
      zIndex: "99999",
      backgroundImage: "url(https://tracker.example/p.gif)",
    } as Record<string, string>;
    const { container } = renderUi(<ThemePreview cssVariables={hostile} mode="light" />);
    const style = root(container).style;
    expect(style.getPropertyValue("--primary")).toBe("light-dark(red, red)");
    expect(style.position).toBe("");
    expect(style.zIndex).toBe("");
    expect(style.backgroundImage).toBe("");
  });
});
