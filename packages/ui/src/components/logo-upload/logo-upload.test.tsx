import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { Field } from "../field/index.js";
import { LogoUpload } from "./logo-upload.js";
import { GIF, PNG, stubBrowser, text } from "./test-support.js";

const GOOD = "data:image/webp;base64,QUJD";
const OTHER = "data:image/webp;base64,REVG";
const short = () => GOOD;

const png = (name = "logo.png") => new File([PNG as BlobPart], name, { type: "image/png" });
// A file named .png whose bytes are not a PNG: the extension and type must not be trusted.
const fake = (bytes: Uint8Array, name = "logo.png") =>
  new File([bytes as BlobPart], name, { type: "image/png" });

const fileInput = (c: HTMLElement) => c.querySelector('input[type="file"]') as HTMLInputElement;
const zone = (c: HTMLElement) => c.querySelector('[data-slot="logo-upload"]') as HTMLElement;
const img = (c: HTMLElement) => c.querySelector("img");

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("LogoUpload: parts", () => {
  it("shows Choose a logo and no preview when empty", () => {
    const { container } = renderUi(<LogoUpload />);
    expect(screen.getByRole("button", { name: "Choose a logo" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Remove logo" })).toBeNull();
    expect(img(container)).toBeNull();
    expect(fileInput(container).accept).toBe("image/png,image/jpeg,image/webp");
  });

  it("shows Replace logo, a preview and Remove logo when it has a value", () => {
    const { container } = renderUi(<LogoUpload defaultValue={GOOD} />);
    expect(screen.getByRole("button", { name: "Replace logo" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Remove logo" })).not.toBeNull();
    expect(img(container)?.getAttribute("src")).toBe(GOOD);
    expect(img(container)?.getAttribute("alt")).toBe("Logo preview");
  });

  it("the labels can be replaced", () => {
    renderUi(
      <LogoUpload
        defaultValue={GOOD}
        replaceLabel="Swap"
        removeLabel="Drop it"
        previewAlt="Our logo"
      />,
    );
    expect(screen.getByRole("button", { name: "Swap" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Drop it" })).not.toBeNull();
    expect(screen.getByAltText("Our logo")).not.toBeNull();
  });

  it("ref is the choose button", () => {
    const ref = createRef<HTMLButtonElement>();
    renderUi(<LogoUpload ref={ref} />);
    expect(ref.current).toBe(screen.getByRole("button", { name: "Choose a logo" }));
  });

  it("name renders a hidden input holding the value, and nothing without name", () => {
    const { container, rerender } = renderUi(<LogoUpload name="logo" defaultValue={GOOD} />);
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden.name).toBe("logo");
    expect(hidden.value).toBe(GOOD);
    rerender(<LogoUpload />);
    expect(container.querySelector('input[type="hidden"]')).toBeNull();
  });

  it("an https value previews; an unsupported value shows no img but can be removed", () => {
    const { container, rerender } = renderUi(
      <LogoUpload value="https://cdn.example.test/logo.png" />,
    );
    expect(img(container)).not.toBeNull();
    for (const bad of [
      "javascript:alert(1)",
      "http://cdn.example.test/logo.png",
      "data:image/svg+xml;base64,PHN2Zy8+",
      "https://user:pass@cdn.example.test/logo.png",
    ]) {
      rerender(<LogoUpload value={bad} />);
      expect(img(container)).toBeNull();
      expect(screen.getByRole("button", { name: "Remove logo" })).not.toBeNull();
    }
  });
});

describe("LogoUpload: choosing a file", () => {
  it("a good file calls onValueChange once with the data URI and shows the preview", async () => {
    stubBrowser({ width: 800, height: 600 }, short);
    const onValueChange = vi.fn();
    const user = setupUser();
    const { container } = renderUi(<LogoUpload onValueChange={onValueChange} />);
    await user.upload(fileInput(container), png());
    await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(1));
    expect(onValueChange).toHaveBeenCalledWith(GOOD);
    expect(img(container)?.getAttribute("src")).toBe(GOOD);
    expect(screen.getByRole("status").textContent).toBe("Logo ready");
    expect(screen.getByRole("button", { name: "Replace logo" })).not.toBeNull();
  });

  it("controlled: shows the parent's value until the parent accepts the new one", async () => {
    stubBrowser({ width: 800, height: 600 }, short);
    const onValueChange = vi.fn();
    const user = setupUser();
    const { container, rerender } = renderUi(
      <LogoUpload value={OTHER} onValueChange={onValueChange} />,
    );
    await user.upload(fileInput(container), png());
    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith(GOOD));
    expect(img(container)?.getAttribute("src")).toBe(OTHER);
    rerender(<LogoUpload value={GOOD} onValueChange={onValueChange} />);
    expect(img(container)?.getAttribute("src")).toBe(GOOD);
  });

  it("shows the busy text while preparing, then Logo ready", async () => {
    stubBrowser({ width: 800, height: 600 }, short);
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const real = globalThis.createImageBitmap;
    vi.stubGlobal("createImageBitmap", async (...args: Parameters<typeof real>) => {
      await gate;
      return real(...args);
    });
    const user = setupUser();
    const { container } = renderUi(<LogoUpload />);
    await user.upload(fileInput(container), png());
    expect(screen.getByRole("status").textContent).toBe("Preparing your logo...");
    release();
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Logo ready"));
  });

  it("passes maxChars to the shrinking", async () => {
    stubBrowser({ width: 800, height: 600 }, () => `data:image/webp;base64,${"A".repeat(3000)}`);
    const onError = vi.fn();
    const user = setupUser();
    const { container } = renderUi(<LogoUpload maxChars={2000} onError={onError} />);
    await user.upload(fileInput(container), png());
    await waitFor(() => expect(onError).toHaveBeenCalledWith("cannot-fit"));
  });

  it("the default limit is the theme's data URI limit", async () => {
    const { MAX_DATA_URI_CHARS } = await import("../../theme/config.js");
    stubBrowser(
      { width: 800, height: 600 },
      () => `data:image/webp;base64,${"A".repeat(MAX_DATA_URI_CHARS)}`,
    );
    const onError = vi.fn();
    const user = setupUser();
    const { container } = renderUi(<LogoUpload onError={onError} />);
    await user.upload(fileInput(container), png());
    await waitFor(() => expect(onError).toHaveBeenCalledWith("cannot-fit"));
  });
});

describe("LogoUpload: refusals", () => {
  it.each([
    ["svg", text("<svg xmlns='http://www.w3.org/2000/svg'/>"), "SVG logos cannot be used here."],
    ["not-an-image", GIF, "That file is not a PNG, JPEG or WebP image."],
  ] as const)(
    "a %s file calls onError, shows the text with role alert, links it, and keeps the old logo",
    async (code, bytes, message) => {
      stubBrowser({ width: 800, height: 600 }, short);
      const onError = vi.fn();
      const onValueChange = vi.fn();
      const user = setupUser();
      const { container } = renderUi(
        <LogoUpload defaultValue={OTHER} onError={onError} onValueChange={onValueChange} />,
      );
      await user.upload(fileInput(container), fake(bytes));
      await waitFor(() => expect(onError).toHaveBeenCalledWith(code));
      const alert = screen.getByRole("alert");
      expect(alert.textContent).toContain(message);
      const choose = screen.getByRole("button", { name: "Replace logo" });
      expect(choose.getAttribute("aria-describedby")).toContain(alert.id);
      expect(choose.getAttribute("aria-invalid")).toBe("true");
      expect(onValueChange).not.toHaveBeenCalled();
      expect(img(container)?.getAttribute("src")).toBe(OTHER);
      expect(screen.getByRole("status").textContent).toBe("");
    },
  );

  it("cannot-fit is reported with its text", async () => {
    stubBrowser({ width: 800, height: 600 }, () => `data:image/webp;base64,${"A".repeat(40_000)}`);
    const user = setupUser();
    const { container } = renderUi(<LogoUpload />);
    await user.upload(fileInput(container), png());
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("cannot be made small enough"),
    );
  });

  it("a later good file clears the error and calls onError(undefined)", async () => {
    stubBrowser({ width: 800, height: 600 }, short);
    const onError = vi.fn();
    const user = setupUser();
    const { container } = renderUi(<LogoUpload onError={onError} />);
    await user.upload(fileInput(container), fake(GIF));
    await waitFor(() => expect(screen.getByRole("alert")).not.toBeNull());
    await user.upload(fileInput(container), png("again.png"));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(onError).toHaveBeenLastCalledWith(undefined);
  });

  it("does not call onError(undefined) when nothing was wrong", async () => {
    stubBrowser({ width: 800, height: 600 }, short);
    const onError = vi.fn();
    const user = setupUser();
    const { container } = renderUi(<LogoUpload onError={onError} />);
    await user.upload(fileInput(container), png());
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Logo ready"));
    expect(onError).not.toHaveBeenCalled();
  });

  it("errors overrides the text", async () => {
    stubBrowser({ width: 800, height: 600 }, short);
    const user = setupUser();
    const { container } = renderUi(
      <LogoUpload errors={{ "not-an-image": "Kei te pai, but no." }} />,
    );
    await user.upload(fileInput(container), fake(GIF));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Kei te pai, but no."));
  });
});

describe("LogoUpload: remove and replace", () => {
  it("Remove calls onValueChange(undefined), clears the error and focuses the choose button", async () => {
    stubBrowser({ width: 800, height: 600 }, short);
    const onValueChange = vi.fn();
    const user = setupUser();
    const { container } = renderUi(
      <LogoUpload defaultValue={OTHER} onValueChange={onValueChange} />,
    );
    await user.upload(fileInput(container), fake(GIF));
    await waitFor(() => expect(screen.getByRole("alert")).not.toBeNull());
    await user.click(screen.getByRole("button", { name: "Remove logo" }));
    expect(onValueChange).toHaveBeenCalledWith(undefined);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(img(container)).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Choose a logo" }));
  });

  it("choosing the same file again after Remove still fires", async () => {
    stubBrowser({ width: 800, height: 600 }, short);
    const onValueChange = vi.fn();
    const user = setupUser();
    const { container } = renderUi(<LogoUpload onValueChange={onValueChange} />);
    const file = png();
    await user.upload(fileInput(container), file);
    await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(1));
    expect(fileInput(container).value).toBe("");
    await user.click(screen.getByRole("button", { name: "Remove logo" }));
    await user.upload(fileInput(container), file);
    await waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith(GOOD));
    expect(onValueChange).toHaveBeenCalledTimes(3);
  });
});

describe("LogoUpload: overlapping work", () => {
  /** Decoding that finishes when its own gate is opened, in the order files were chosen. */
  function gatedDecode() {
    const gates: Array<() => void> = [];
    vi.stubGlobal("createImageBitmap", () => {
      return new Promise((resolve) => {
        gates.push(() => resolve({ width: 800, height: 600, close: vi.fn() }));
      });
    });
    return gates;
  }

  it("the latest choice wins: a slow first file never overwrites a second", async () => {
    stubBrowser({ width: 800, height: 600 }, ({ width }) => (width === 512 ? GOOD : OTHER));
    const gates = gatedDecode();
    const onValueChange = vi.fn();
    const user = setupUser();
    const { container } = renderUi(<LogoUpload onValueChange={onValueChange} />);
    await user.upload(fileInput(container), png("first.png"));
    await user.upload(fileInput(container), png("second.png"));
    await waitFor(() => expect(gates).toHaveLength(2));
    gates[1]?.();
    await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(1));
    gates[0]?.();
    await new Promise((r) => setTimeout(r, 20));
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it("removing while preparing drops the result", async () => {
    stubBrowser({ width: 800, height: 600 }, short);
    const gates = gatedDecode();
    const onValueChange = vi.fn();
    const user = setupUser();
    const { container } = renderUi(
      <LogoUpload defaultValue={OTHER} onValueChange={onValueChange} />,
    );
    await user.upload(fileInput(container), png());
    await waitFor(() => expect(gates).toHaveLength(1));
    await user.click(screen.getByRole("button", { name: "Remove logo" }));
    gates[0]?.();
    await new Promise((r) => setTimeout(r, 20));
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(undefined);
    expect(img(container)).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("unmounting while preparing logs no state-update warning and calls nothing", async () => {
    stubBrowser({ width: 800, height: 600 }, short);
    const gates = gatedDecode();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const onValueChange = vi.fn();
    const user = setupUser();
    const { container, unmount } = renderUi(<LogoUpload onValueChange={onValueChange} />);
    await user.upload(fileInput(container), png());
    await waitFor(() => expect(gates).toHaveLength(1));
    unmount();
    gates[0]?.();
    await new Promise((r) => setTimeout(r, 20));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});

describe("LogoUpload: dropping", () => {
  const drop = (target: HTMLElement, files: File[], types = ["Files"]) =>
    fireEvent.drop(target, { dataTransfer: { files, types } });

  it("dropping an image prepares it", async () => {
    stubBrowser({ width: 800, height: 600 }, short);
    const onValueChange = vi.fn();
    const { container } = renderUi(<LogoUpload onValueChange={onValueChange} />);
    drop(zone(container), [png()]);
    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith(GOOD));
  });

  it("dropping several files uses the first", async () => {
    const { decode } = stubBrowser({ width: 800, height: 600 }, short);
    const onValueChange = vi.fn();
    const { container } = renderUi(<LogoUpload onValueChange={onValueChange} />);
    drop(zone(container), [png("a.png"), png("b.png")]);
    await waitFor(() => expect(onValueChange).toHaveBeenCalledTimes(1));
    expect(decode).toHaveBeenCalledTimes(1);
    expect((decode.mock.calls[0] as unknown as [File])[0].name).toBe("a.png");
  });

  it("dropping text or a link does nothing", () => {
    const { decode } = stubBrowser({ width: 800, height: 600 }, short);
    const { container } = renderUi(<LogoUpload />);
    const notPrevented = fireEvent.drop(zone(container), {
      dataTransfer: { files: [], types: ["text/plain"] },
    });
    expect(notPrevented).toBe(true);
    expect(decode).not.toHaveBeenCalled();
  });

  it("dragging a file over sets data-dragging and leaving clears it", () => {
    const { container } = renderUi(<LogoUpload />);
    fireEvent.dragEnter(zone(container), { dataTransfer: { types: ["Files"] } });
    expect(zone(container).hasAttribute("data-dragging")).toBe(true);
    fireEvent.dragLeave(zone(container));
    expect(zone(container).hasAttribute("data-dragging")).toBe(false);
    fireEvent.dragEnter(zone(container), { dataTransfer: { types: ["text/plain"] } });
    expect(zone(container).hasAttribute("data-dragging")).toBe(false);
  });

  it("disabled ignores drops, and disables every button and the file input", async () => {
    const { decode } = stubBrowser({ width: 800, height: 600 }, short);
    const onValueChange = vi.fn();
    const { container } = renderUi(
      <LogoUpload disabled defaultValue={GOOD} onValueChange={onValueChange} />,
    );
    drop(zone(container), [png()]);
    // Reading the file's first bytes is async, so give a wrongly accepted drop time to show.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(decode).not.toHaveBeenCalled();
    expect(onValueChange).not.toHaveBeenCalled();
    fireEvent.dragEnter(zone(container), { dataTransfer: { types: ["Files"] } });
    expect(zone(container).hasAttribute("data-dragging")).toBe(false);
    const buttons = screen.getAllByRole("button") as HTMLButtonElement[];
    expect(buttons).toHaveLength(2);
    for (const b of buttons) expect(b.disabled).toBe(true);
    expect(fileInput(container).disabled).toBe(true);
  });
});

describe("LogoUpload: Field and accessibility", () => {
  it("Field labels the choose button and its error describes it", () => {
    renderUi(
      <Field label="Company logo" description="PNG, JPEG or WebP" error="Add a logo">
        {(control) => <LogoUpload {...control} />}
      </Field>,
    );
    const button = screen.getByRole("button", { name: /Company logo/ });
    expect(button.getAttribute("aria-invalid")).toBe("true");
    // The description and the error, both by id.
    const ids = (button.getAttribute("aria-describedby") ?? "").split(" ");
    expect(ids).toHaveLength(2);
    expect(ids.map((i) => document.getElementById(i)?.textContent)).toEqual([
      "PNG, JPEG or WebP",
      "Add a logo",
    ]);
    expect(button.textContent).toContain("Choose a logo");
  });

  it("has no axe violations: empty, with a value, with an error, disabled", async () => {
    stubBrowser({ width: 800, height: 600 }, short);
    const user = setupUser();
    const empty = renderUi(<LogoUpload />);
    await expectNoA11yViolations(empty.container);
    empty.unmount();

    const filled = renderUi(<LogoUpload defaultValue={GOOD} />);
    await expectNoA11yViolations(filled.container);
    filled.unmount();

    const failed = renderUi(<LogoUpload />);
    await user.upload(fileInput(failed.container), fake(GIF));
    await waitFor(() => expect(screen.getByRole("alert")).not.toBeNull());
    await expectNoA11yViolations(failed.container);
    failed.unmount();

    const disabled = renderUi(<LogoUpload disabled defaultValue={GOOD} />);
    await expectNoA11yViolations(disabled.container);
  });

  it("Tab goes to the choose button, then Remove; Enter and Space open the file chooser", async () => {
    const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    const user = setupUser();
    renderUi(<LogoUpload defaultValue={GOOD} />);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Replace logo" }));
    await user.keyboard("{Enter}");
    expect(click).toHaveBeenCalledTimes(1);
    await user.keyboard(" ");
    expect(click).toHaveBeenCalledTimes(2);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Remove logo" }));
  });
});
