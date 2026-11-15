import { screen, waitFor } from "@testing-library/dom";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { Field } from "../field/index.js";
import { LogoUpload } from "./logo-upload.js";
import { PNG, stubBrowser } from "./test-support.js";

const GOOD = "data:image/webp;base64,QUJD";
const png = () => new File([PNG as BlobPart], "logo.png", { type: "image/png" });
const fileInput = (c: HTMLElement) => c.querySelector('input[type="file"]') as HTMLInputElement;
const hidden = (c: HTMLElement) => c.querySelector('input[type="hidden"]') as HTMLInputElement;
const img = (c: HTMLElement) => c.querySelector("img");

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("LogoUpload: a parent that starts with no logo", () => {
  // The usual shape: `useState<string>()` starts undefined and is passed straight back.
  function Parent() {
    const [logo, setLogo] = useState<string | undefined>();
    return <LogoUpload name="logo" value={logo} onValueChange={setLogo} />;
  }

  it("Remove clears it on the first press", async () => {
    stubBrowser({ width: 800, height: 600 }, () => GOOD);
    const user = setupUser();
    const { container } = renderUi(<Parent />);
    await user.upload(fileInput(container), png());
    await waitFor(() => expect(img(container)?.getAttribute("src")).toBe(GOOD));
    expect(hidden(container).value).toBe(GOOD);

    await user.click(screen.getByRole("button", { name: "Remove logo" }));
    expect(img(container)).toBeNull();
    expect(screen.getByRole("button", { name: "Choose a logo" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Remove logo" })).toBeNull();
    expect(hidden(container).value).toBe("");
  });

  it("value={undefined} means controlled with no logo: a parent that ignores the change shows none", async () => {
    stubBrowser({ width: 800, height: 600 }, () => GOOD);
    const onValueChange = vi.fn();
    const user = setupUser();
    const { container } = renderUi(<LogoUpload value={undefined} onValueChange={onValueChange} />);
    await user.upload(fileInput(container), png());
    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith(GOOD));
    expect(img(container)).toBeNull();
    expect(screen.getByRole("button", { name: "Choose a logo" })).not.toBeNull();
  });

  it("leaving value out keeps it uncontrolled", async () => {
    stubBrowser({ width: 800, height: 600 }, () => GOOD);
    const user = setupUser();
    const { container } = renderUi(<LogoUpload />);
    await user.upload(fileInput(container), png());
    await waitFor(() => expect(img(container)?.getAttribute("src")).toBe(GOOD));
  });
});

describe("LogoUpload: required", () => {
  it("has no axe violations inside a required Field, and does not put aria-required on the button", async () => {
    const { container } = renderUi(
      <Field label="Company logo" required>
        {(control) => <LogoUpload {...control} />}
      </Field>,
    );
    const button = screen.getByRole("button", { name: /Company logo/ });
    expect(button.hasAttribute("aria-required")).toBe(false);
    await expectNoA11yViolations(container);
  });

  it("says Required to a screen reader through the button's description", () => {
    renderUi(
      <Field label="Company logo" required>
        {(control) => <LogoUpload {...control} />}
      </Field>,
    );
    const button = screen.getByRole("button", { name: /Company logo/ });
    const described = (button.getAttribute("aria-describedby") ?? "")
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent);
    expect(described).toContain("Required");
  });

  it("requiredLabel changes the words, and nothing is added when not required", () => {
    const { rerender } = renderUi(<LogoUpload aria-required requiredLabel="Kei te hiahiatia" />);
    const button = screen.getByRole("button", { name: "Choose a logo" });
    const text = (b: HTMLElement) =>
      (b.getAttribute("aria-describedby") ?? "")
        .split(" ")
        .map((id) => document.getElementById(id)?.textContent);
    expect(text(button)).toContain("Kei te hiahiatia");
    rerender(<LogoUpload />);
    expect(
      screen.getByRole("button", { name: "Choose a logo" }).hasAttribute("aria-describedby"),
    ).toBe(false);
  });
});
