import { screen, waitFor, within } from "@testing-library/dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { createTheme, parseThemeJson, type ThemeConfig, validateTheme } from "../../theme/index.js";
import { GIF, PNG, stubBrowser } from "../logo-upload/test-support.js";
import { DEFAULT_MESSAGES } from "./messages.js";
import { ThemeStudio } from "./theme-studio.js";

const LOGO = "data:image/webp;base64,QUJD";
const NEW_LOGO = "data:image/webp;base64,REVG";

/** Settings the studio does not show. */
const BASE: ThemeConfig = {
  version: 1,
  name: "Harbour & Pine",
  brand: "#1d4ed8",
  radius: "0.75rem",
  density: "compact",
  tint: 0.01,
  light: { "primary-foreground": "#ffffff" },
  branding: {
    appName: "Harbour & Pine",
    logo: LOGO,
    favicon: "https://harbourandpine.example/i.png",
  },
};

const png = () => new File([PNG as BlobPart], "logo.png", { type: "image/png" });
const gif = () => new File([GIF as BlobPart], "logo.png", { type: "image/png" });
const light = () => within(screen.getByRole("group", { name: /^Light mode/ }));
const dark = () => within(screen.getByRole("group", { name: /^Dark mode/ }));
const save = () => screen.getByRole("button", { name: "Save branding" });
const reset = () => screen.getByRole("button", { name: "Reset" });
const preview = (c: HTMLElement) => c.querySelector('[data-slot="theme-preview"]') as HTMLElement;
const logoInput = (scope: ReturnType<typeof within>) =>
  (
    scope.getByLabelText("Logo", { selector: "button" }).closest("fieldset") as HTMLElement
  ).querySelector("input[type=file]") as HTMLInputElement;

/** The config `onSave` was first called with. */
const saved = (onSave: { mock: { calls: unknown[][] } }) =>
  onSave.mock.calls[0]?.[0] as ThemeConfig;

async function replaceText(user: ReturnType<typeof setupUser>, input: HTMLElement, text: string) {
  await user.clear(input);
  if (text) await user.type(input, text);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.documentElement.removeAttribute("style");
});

describe("ThemeStudio: what it shows", () => {
  it("shows empty fields and no notes for no value", () => {
    renderUi(<ThemeStudio onSave={vi.fn()} />);
    expect((screen.getByLabelText("App name") as HTMLInputElement).value).toBe("");
    expect((light().getByLabelText("Brand colour") as HTMLInputElement).value).toBe("");
    expect(screen.queryByText(/Links and labels use/)).toBeNull();
    expect(save().hasAttribute("disabled")).toBe(true);
  });

  it("shows the incoming name, colours and logos", () => {
    renderUi(
      <ThemeStudio
        value={{
          ...BASE,
          brandDark: "#93c5fd",
          branding: { ...BASE.branding, logoDark: NEW_LOGO },
        }}
        onSave={vi.fn()}
      />,
    );
    expect((screen.getByLabelText("App name") as HTMLInputElement).value).toBe("Harbour & Pine");
    expect((light().getByLabelText("Brand colour") as HTMLInputElement).value).toBe("#1d4ed8");
    expect((dark().getByLabelText("Brand colour") as HTMLInputElement).value).toBe("#93c5fd");
    expect(light().getByRole("img", { name: "Logo preview" }).getAttribute("src")).toBe(LOGO);
    expect(dark().getByRole("img", { name: "Logo preview" }).getAttribute("src")).toBe(NEW_LOGO);
  });

  it("uses distinct swatch names for the light and dark colours", () => {
    renderUi(<ThemeStudio onSave={vi.fn()} />);
    expect(light().getByLabelText("Choose light mode colour")).not.toBeNull();
    expect(dark().getByLabelText("Choose dark mode colour")).not.toBeNull();
  });

  it("uses the messages it is given", () => {
    renderUi(<ThemeStudio onSave={vi.fn()} messages={{ save: "Tiaki", appNameLabel: "Ingoa" }} />);
    expect(screen.getByRole("button", { name: "Tiaki" })).not.toBeNull();
    expect(screen.getByLabelText("Ingoa")).not.toBeNull();
  });
});

describe("ThemeStudio: the live preview", () => {
  it("typing a valid colour updates the preview variables straight away", async () => {
    const user = setupUser();
    const { container } = renderUi(<ThemeStudio onSave={vi.fn()} />);
    await replaceText(user, light().getByLabelText("Brand colour"), "#0e7490");
    expect(preview(container).style.getPropertyValue("--primary")).toBe(
      createTheme({ brand: "#0e7490" }).cssVariables["--primary"],
    );
  });

  it("typing an invalid colour keeps the last good preview and shows the error after blur", async () => {
    const user = setupUser();
    const { container } = renderUi(<ThemeStudio onSave={vi.fn()} />);
    const input = light().getByLabelText("Brand colour");
    await replaceText(user, input, "#0e7490");
    const good = preview(container).style.getPropertyValue("--primary");
    await user.type(input, "2");
    expect(preview(container).style.getPropertyValue("--primary")).toBe(good);
    expect(screen.queryByText(/must be a colour such as/)).toBeNull();
    await user.tab();
    await user.tab();
    expect(screen.getByText("Light mode colour must be a colour such as #1a73e8.")).not.toBeNull();
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(preview(container).style.getPropertyValue("--primary")).toBe(good);
    expect(save().hasAttribute("disabled")).toBe(true);
  });

  it("the toggle switches the preview to dark and sets color-scheme on the preview only", async () => {
    const user = setupUser();
    const { container } = renderUi(<ThemeStudio value={BASE} onSave={vi.fn()} />);
    expect(
      preview(container).style.colorScheme || preview(container).getAttribute("style"),
    ).toContain("light");
    await user.click(screen.getByRole("button", { name: "Dark" }));
    expect(preview(container).getAttribute("data-mode")).toBe("dark");
    expect(preview(container).getAttribute("style")).toContain("dark");
    expect(screen.getByRole("button", { name: "Dark" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("the live page is untouched", async () => {
    const user = setupUser();
    renderUi(<ThemeStudio onSave={vi.fn()} />);
    await replaceText(user, light().getByLabelText("Brand colour"), "#0e7490");
    await user.click(screen.getByRole("button", { name: "Dark" }));
    expect(document.documentElement.getAttribute("style")).toBeNull();
    expect(document.documentElement.className).toBe("");
    expect(document.body.getAttribute("style")).toBeNull();
  });

  it("the Light/Dark toggle moves with the arrow keys and always keeps one pressed", async () => {
    const user = setupUser();
    renderUi(<ThemeStudio onSave={vi.fn()} />);
    const lightButton = screen.getByRole("button", { name: "Light" });
    const darkButton = screen.getByRole("button", { name: "Dark" });
    lightButton.focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(darkButton);
    await user.keyboard(" ");
    expect(darkButton.getAttribute("aria-pressed")).toBe("true");
    await user.keyboard(" ");
    expect(darkButton.getAttribute("aria-pressed")).toBe("true");
    expect(lightButton.getAttribute("aria-pressed")).toBe("false");
  });
});

describe("ThemeStudio: the note under each colour", () => {
  it("shows Readable or the adjusted sentence with the shade", async () => {
    const user = setupUser();
    renderUi(<ThemeStudio onSave={vi.fn()} />);
    const input = light().getByLabelText("Brand colour");
    await replaceText(user, input, "#1d4ed8");
    expect(light().getByText("Readable as it is.")).not.toBeNull();
    await replaceText(user, input, "#ffff99");
    expect(
      light().getByText(
        "Adjusted slightly so buttons and text stay readable. Links and labels use #777508.",
      ),
    ).not.toBeNull();
    expect(input.getAttribute("aria-describedby")).toBeTruthy();
  });

  it("an empty dark colour says it uses the light colour, adjusted for dark", async () => {
    const user = setupUser();
    renderUi(<ThemeStudio onSave={vi.fn()} />);
    await replaceText(user, light().getByLabelText("Brand colour"), "#1d4ed8");
    expect(
      dark().getByText(
        /Uses your light mode colour, adjusted for dark\. Links and labels use #[0-9a-f]{6}\./,
      ),
    ).not.toBeNull();
    expect(dark().getByText(DEFAULT_MESSAGES.darkOptional)).not.toBeNull();
  });
});

describe("ThemeStudio: saving", () => {
  it("Save is disabled until something changes, and Reset with it", async () => {
    const user = setupUser();
    renderUi(<ThemeStudio value={BASE} onSave={vi.fn()} />);
    expect(save().hasAttribute("disabled")).toBe(true);
    expect(reset().hasAttribute("disabled")).toBe(true);
    await user.type(screen.getByLabelText("App name"), " 2");
    expect(save().hasAttribute("disabled")).toBe(false);
    expect(reset().hasAttribute("disabled")).toBe(false);
  });

  it("Save calls onSave once with a config that passes the library, hidden settings untouched", async () => {
    const user = setupUser();
    const onSave = vi.fn();
    renderUi(<ThemeStudio value={BASE} onSave={onSave} />);
    await replaceText(user, screen.getByLabelText("App name"), "Pine & Harbour");
    await replaceText(user, light().getByLabelText("Brand colour"), "#0e7490");
    await user.click(save());
    expect(onSave).toHaveBeenCalledTimes(1);
    const config = onSave.mock.calls[0]?.[0] as ThemeConfig;
    expect(config).toEqual({
      ...BASE,
      brand: "#0e7490",
      branding: { ...BASE.branding, appName: "Pine & Harbour" },
    });
    expect(() => parseThemeJson(JSON.stringify(config))).not.toThrow();
    expect(validateTheme(config)).toEqual([]);
  });

  it("an unreadable result cannot be saved, names the role and can be fixed", async () => {
    const user = setupUser();
    const onSave = vi.fn();
    renderUi(<ThemeStudio value={BASE} onSave={onSave} />);
    const input = light().getByLabelText("Brand colour");
    await replaceText(user, input, "#ffee00");
    const alert = screen.getByText(/A setting made by a developer conflicts/);
    expect(alert.textContent).toContain("primary-foreground");
    expect(
      screen.getByText(/Details for the developer:.*primary-foreground on primary \(light\)/),
    ).not.toBeNull();
    expect(save().hasAttribute("disabled")).toBe(true);
    await user.click(save());
    expect(onSave).not.toHaveBeenCalled();
    await replaceText(user, input, "#0e7490");
    expect(screen.queryByText(/A setting made by a developer conflicts/)).toBeNull();
    expect(save().hasAttribute("disabled")).toBe(false);
  });

  it("an incoming theme that already fails shows the conflict before any edit", () => {
    renderUi(<ThemeStudio value={{ ...BASE, brand: "#ffee00" }} onSave={vi.fn()} />);
    expect(screen.getByText(/A setting made by a developer conflicts/)).not.toBeNull();
    expect(save().hasAttribute("disabled")).toBe(true);
  });

  it("a rejected onSave shows the failure message and keeps the draft", async () => {
    const user = setupUser();
    const onSave = vi.fn().mockRejectedValue(new Error("offline"));
    renderUi(<ThemeStudio value={BASE} onSave={onSave} />);
    await replaceText(user, screen.getByLabelText("App name"), "Pine");
    await user.click(save());
    await waitFor(() =>
      expect(screen.getByText("Branding could not be saved. Try again.")).not.toBeNull(),
    );
    expect((screen.getByLabelText("App name") as HTMLInputElement).value).toBe("Pine");
  });

  it("shows the saving state while onSave runs", async () => {
    const user = setupUser();
    let finish: () => void = () => {};
    const onSave = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    renderUi(<ThemeStudio value={BASE} onSave={onSave} />);
    await replaceText(user, screen.getByLabelText("App name"), "Pine");
    await user.click(save());
    expect(screen.getByRole("button", { name: "Saving..." })).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Saving..." }));
    expect(onSave).toHaveBeenCalledTimes(1);
    finish();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Saving..." })).toBeNull());
  });
});

describe("ThemeStudio: logos", () => {
  it("choosing a logo updates the preview and the saved config", async () => {
    stubBrowser({ width: 800, height: 600 }, () => NEW_LOGO);
    const user = setupUser();
    const onSave = vi.fn();
    const { container } = renderUi(<ThemeStudio value={BASE} onSave={onSave} />);
    const input = logoInput(light());
    await user.upload(input, png());
    await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
    expect(preview(container).querySelector("img")?.getAttribute("src")).toBe(NEW_LOGO);
    await user.click(save());
    expect(saved(onSave).branding?.logo).toBe(NEW_LOGO);
  });

  it("Save is disabled while a logo is being prepared", async () => {
    const { decode } = stubBrowser({ width: 800, height: 600 }, () => NEW_LOGO);
    let release: () => void = () => {};
    decode.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ width: 800, height: 600, close: vi.fn() });
        }),
    );
    const user = setupUser();
    renderUi(<ThemeStudio value={BASE} onSave={vi.fn()} />);
    await user.type(screen.getByLabelText("App name"), " 2");
    expect(save().hasAttribute("disabled")).toBe(false);
    const input = logoInput(dark());
    await user.upload(input, png());
    await waitFor(() => expect(save().hasAttribute("disabled")).toBe(true));
    release();
    await waitFor(() => expect(save().hasAttribute("disabled")).toBe(false));
  });

  it("a logo that cannot fit is reported next to the control and the old logo stays", async () => {
    stubBrowser({ width: 800, height: 600 }, () => `data:image/webp;base64,${"A".repeat(40_000)}`);
    const user = setupUser();
    const onSave = vi.fn();
    renderUi(<ThemeStudio value={BASE} onSave={onSave} />);
    const input = logoInput(light());
    await user.upload(input, png());
    await waitFor(() =>
      expect(
        light().getByText("This logo cannot be made small enough. Try a simpler image."),
      ).not.toBeNull(),
    );
    await user.type(screen.getByLabelText("App name"), " 2");
    await user.click(save());
    expect(saved(onSave).branding?.logo).toBe(LOGO);
  });

  it("a file that is really not an image is refused and the old logo stays", async () => {
    stubBrowser({ width: 800, height: 600 }, () => NEW_LOGO);
    const user = setupUser();
    renderUi(<ThemeStudio value={BASE} onSave={vi.fn()} />);
    const input = logoInput(light());
    await user.upload(input, gif());
    await waitFor(() => expect(light().getByRole("alert")).not.toBeNull());
    expect(light().getByRole("img", { name: "Logo preview" }).getAttribute("src")).toBe(LOGO);
  });

  it("removing the dark logo deletes logoDark from the saved config", async () => {
    const user = setupUser();
    const onSave = vi.fn();
    const value = { ...BASE, branding: { ...BASE.branding, logoDark: NEW_LOGO } };
    renderUi(<ThemeStudio value={value} onSave={onSave} />);
    await user.click(dark().getByRole("button", { name: "Remove logo" }));
    await user.click(save());
    const config = onSave.mock.calls[0]?.[0] as ThemeConfig;
    expect(config.branding && "logoDark" in config.branding).toBe(false);
    expect(config.branding?.logo).toBe(LOGO);
  });
});

describe("ThemeStudio: Reset and the baseline", () => {
  it("Reset restores the incoming value and clears errors", async () => {
    const user = setupUser();
    renderUi(<ThemeStudio value={BASE} onSave={vi.fn()} />);
    const input = light().getByLabelText("Brand colour") as HTMLInputElement;
    await replaceText(user, input, "#12");
    await user.tab();
    await user.tab();
    expect(screen.getByText(/must be a colour such as/)).not.toBeNull();
    await user.click(reset());
    expect(input.value).toBe("#1d4ed8");
    expect(screen.queryByText(/must be a colour such as/)).toBeNull();
    expect(save().hasAttribute("disabled")).toBe(true);
  });

  it("a new value prop after a save becomes the baseline", async () => {
    const user = setupUser();
    const { rerender } = renderUi(<ThemeStudio value={BASE} onSave={vi.fn()} />);
    await replaceText(user, screen.getByLabelText("App name"), "Pine");
    expect(save().hasAttribute("disabled")).toBe(false);
    const saved: ThemeConfig = { ...BASE, branding: { ...BASE.branding, appName: "Pine" } };
    rerender(<ThemeStudio value={saved} onSave={vi.fn()} />);
    expect((screen.getByLabelText("App name") as HTMLInputElement).value).toBe("Pine");
    expect(save().hasAttribute("disabled")).toBe(true);
    await user.type(screen.getByLabelText("App name"), "s");
    await user.click(reset());
    expect((screen.getByLabelText("App name") as HTMLInputElement).value).toBe("Pine");
  });
});

describe("ThemeStudio: keyboard and accessibility", () => {
  it("can be completed with the keyboard alone", async () => {
    const user = setupUser();
    const onSave = vi.fn();
    renderUi(<ThemeStudio onSave={onSave} />);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByLabelText("App name"));
    await user.keyboard("Harbour");
    await user.tab();
    // The swatch comes first, then the text field.
    expect(document.activeElement).toBe(light().getByLabelText("Choose light mode colour"));
    await user.tab();
    expect(document.activeElement).toBe(light().getByLabelText("Brand colour"));
    await user.keyboard("#0e7490");
    for (let i = 0; i < 12 && document.activeElement !== save(); i++) await user.tab();
    expect(document.activeElement).toBe(save());
    await user.keyboard("{Enter}");
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0]?.[0]).toEqual({
      version: 1,
      brand: "#0e7490",
      branding: { appName: "Harbour" },
    });
  });

  it("has no axe violations with the preview in light and in dark, an error and a conflict showing", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <ThemeStudio value={{ ...BASE, brand: "#ffee00" }} onSave={vi.fn()} />,
    );
    await expectNoA11yViolations(container);
    await user.click(screen.getByRole("button", { name: "Dark" }));
    await expectNoA11yViolations(container);
    await replaceText(user, dark().getByLabelText("Brand colour"), "nope");
    await user.tab();
    await user.tab();
    expect(screen.getByText(/must be a colour such as/)).not.toBeNull();
    await expectNoA11yViolations(container);
  });
});

describe("ThemeStudio: review fixes", () => {
  it("clearing the light colour explains the dark colour error without touching it", async () => {
    const user = setupUser();
    renderUi(
      <ThemeStudio
        value={{ version: 1, brand: "#1d4ed8", brandDark: "#93c5fd" }}
        onSave={vi.fn()}
      />,
    );
    await user.clear(light().getByLabelText("Brand colour"));
    expect(screen.getByText(DEFAULT_MESSAGES.errorDarkNeedsLight)).not.toBeNull();
    expect(dark().getByLabelText("Brand colour").getAttribute("aria-invalid")).toBe("true");
    expect(save().hasAttribute("disabled")).toBe(true);
  });

  it("an incoming value that already fails in a visible field is explained at once", () => {
    renderUi(<ThemeStudio value={{ version: 1, brand: "red" } as ThemeConfig} onSave={vi.fn()} />);
    expect(screen.getByText("Light mode colour must be a colour such as #1a73e8.")).not.toBeNull();
    expect(save().hasAttribute("disabled")).toBe(true);
  });

  it("pressing Enter in an invalid field shows its error", async () => {
    const user = setupUser();
    renderUi(<ThemeStudio onSave={vi.fn()} />);
    await user.type(light().getByLabelText("Brand colour"), "1d4ed8");
    expect(screen.queryByText(/must be a colour such as/)).toBeNull();
    await user.keyboard("{Enter}");
    expect(screen.getByText(/must be a colour such as/)).not.toBeNull();
  });

  it("the fields are disabled while a save is running, so nothing typed can be lost", async () => {
    const user = setupUser();
    let finish: () => void = () => {};
    const onSave = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    renderUi(<ThemeStudio value={BASE} onSave={onSave} />);
    await user.type(screen.getByLabelText("App name"), " 2");
    await user.click(save());
    expect((screen.getByLabelText("App name") as HTMLInputElement).disabled).toBe(true);
    expect((light().getByLabelText("Brand colour") as HTMLInputElement).disabled).toBe(true);
    finish();
    await waitFor(() =>
      expect((screen.getByLabelText("App name") as HTMLInputElement).disabled).toBe(false),
    );
  });

  it("a value with the same content in a different key order is not a new value", async () => {
    const user = setupUser();
    const { rerender } = renderUi(<ThemeStudio value={BASE} onSave={vi.fn()} />);
    await user.type(screen.getByLabelText("App name"), " 2");
    const reordered = Object.fromEntries(Object.entries(BASE).reverse()) as ThemeConfig;
    reordered.branding = Object.fromEntries(
      Object.entries(BASE.branding ?? {}).reverse(),
    ) as ThemeConfig["branding"];
    rerender(<ThemeStudio value={reordered} onSave={vi.fn()} />);
    expect((screen.getByLabelText("App name") as HTMLInputElement).value).toBe("Harbour & Pine 2");
  });

  it("clearing the brand colour shows the default colours, not the page's", async () => {
    const user = setupUser();
    document.documentElement.style.setProperty("--primary", "light-dark(red, red)");
    const { container } = renderUi(
      <ThemeStudio value={{ version: 1, brand: "#1d4ed8" }} onSave={vi.fn()} />,
    );
    await user.clear(light().getByLabelText("Brand colour"));
    const primary = preview(container).style.getPropertyValue("--primary");
    expect(primary).toMatch(/^light-dark\(oklch/);
    expect(primary).not.toBe(createTheme({ brand: "#1d4ed8" }).cssVariables["--primary"]);
  });
});
