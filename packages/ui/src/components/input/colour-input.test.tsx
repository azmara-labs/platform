import { fireEvent, screen } from "@testing-library/dom";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderUi, setupUser } from "../../test-utils/index.js";
import { ColourInput } from "./colour-input.js";

const text = (container: HTMLElement) =>
  container.querySelector('input[type="text"]') as HTMLInputElement;
const swatch = (container: HTMLElement) =>
  container.querySelector('input[type="color"]') as HTMLInputElement;
const pick = (container: HTMLElement, value: string) =>
  fireEvent.change(swatch(container), { target: { value } });

describe("ColourInput: parts", () => {
  it("renders a text input and a swatch named Choose a colour", () => {
    const { container } = renderUi(<ColourInput />);
    expect(text(container)).not.toBeNull();
    expect(swatch(container)).not.toBeNull();
    expect(screen.getByLabelText("Choose a colour")).toBe(swatch(container));
  });

  it("swatchLabel renames the swatch", () => {
    const { container } = renderUi(<ColourInput swatchLabel="Pick the brand colour" />);
    expect(screen.getByLabelText("Pick the brand colour")).toBe(swatch(container));
  });

  it("ref is the text input", () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = renderUi(<ColourInput ref={ref} />);
    expect(ref.current).toBe(text(container));
    expect(ref.current?.type).toBe("text");
  });

  it("puts className on the wrapper, after the defaults", () => {
    const { container } = renderUi(<ColourInput className="max-w-xs" />);
    const wrapper = container.querySelector('[data-slot="colour-input"]') as HTMLElement;
    expect(wrapper.className).toContain("max-w-xs");
    expect(wrapper.className.endsWith("max-w-xs")).toBe(true);
    expect(text(container).className).not.toContain("max-w-xs");
  });

  it("passes other attributes to the text input and not the swatch", () => {
    const { container } = renderUi(
      <ColourInput name="brand" placeholder="#1f7a5c" aria-label="Brand colour" />,
    );
    expect(text(container).name).toBe("brand");
    expect(text(container).placeholder).toBe("#1f7a5c");
    expect(text(container).getAttribute("aria-label")).toBe("Brand colour");
    expect(swatch(container).name).toBe("");
    expect(swatch(container).getAttribute("aria-label")).toBe("Choose a colour");
  });
});

describe("ColourInput: the swatch follows the text", () => {
  it("shows a hex value, lower-cased", () => {
    const { container } = renderUi(<ColourInput defaultValue="#1F7A5C" />);
    expect(swatch(container).value).toBe("#1f7a5c");
    expect(text(container).value).toBe("#1F7A5C");
  });

  it("expands a 3-digit hex for the swatch only", () => {
    const { container } = renderUi(<ColourInput defaultValue="#0af" />);
    expect(swatch(container).value).toBe("#00aaff");
    expect(text(container).value).toBe("#0af");
  });

  it("ignores spaces around a hex value", () => {
    const { container } = renderUi(<ColourInput defaultValue=" #1f7a5c " />);
    expect(swatch(container).value).toBe("#1f7a5c");
    expect(swatch(container).hasAttribute("data-empty")).toBe(false);
  });

  it.each(["", "red", "oklch(0.5 0.1 200)", "#12345", "#1234567"])(
    "marks the swatch empty for %j",
    (value) => {
      const { container } = renderUi(<ColourInput defaultValue={value} />);
      expect(swatch(container).hasAttribute("data-empty")).toBe(true);
      expect(text(container).value).toBe(value);
    },
  );

  it("does not mark a hex colour empty", () => {
    const { container } = renderUi(<ColourInput defaultValue="#123456" />);
    expect(swatch(container).hasAttribute("data-empty")).toBe(false);
  });

  it("moves the swatch when a valid hex is typed", async () => {
    const user = setupUser();
    const { container } = renderUi(<ColourInput />);
    expect(swatch(container).hasAttribute("data-empty")).toBe(true);
    await user.type(text(container), "#AB12EF");
    expect(swatch(container).value).toBe("#ab12ef");
    expect(swatch(container).hasAttribute("data-empty")).toBe(false);
  });
});

describe("ColourInput: picking a colour", () => {
  it("sets the text, lower-cased, and fires onChange and onValueChange once each", () => {
    const onChange = vi.fn();
    const onValueChange = vi.fn();
    const { container } = renderUi(
      <ColourInput defaultValue="#112233" onChange={onChange} onValueChange={onValueChange} />,
    );
    pick(container, "#FF8800");
    expect(text(container).value).toBe("#ff8800");
    expect(swatch(container).value).toBe("#ff8800");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0]?.[0]).toBe("#ff8800");
  });

  it("controlled: reports a pick but keeps the parent's value until the parent accepts it", () => {
    const onValueChange = vi.fn();
    const { container, rerender } = renderUi(
      <ColourInput value="#112233" onValueChange={onValueChange} />,
    );
    pick(container, "#FF8800");
    expect(onValueChange.mock.calls[0]?.[0]).toBe("#ff8800");
    expect(text(container).value).toBe("#112233");
    expect(swatch(container).value).toBe("#112233");
    rerender(<ColourInput value="#ff8800" onValueChange={onValueChange} />);
    expect(text(container).value).toBe("#ff8800");
    expect(swatch(container).value).toBe("#ff8800");
  });
});

describe("ColourInput: disabled and read-only", () => {
  it("disabled disables both controls", () => {
    const { container } = renderUi(<ColourInput disabled defaultValue="#112233" />);
    expect(text(container).disabled).toBe(true);
    expect(swatch(container).disabled).toBe(true);
  });

  it("readOnly: the swatch is disabled and the text does not change", () => {
    const { container } = renderUi(<ColourInput readOnly defaultValue="#112233" />);
    expect(text(container).readOnly).toBe(true);
    expect(swatch(container).disabled).toBe(true);
    pick(container, "#ff8800");
    expect(text(container).value).toBe("#112233");
  });
});

describe("ColourInput: finishing a pick", () => {
  it("leaving the swatch after a pick commits the value and blurs the text input", () => {
    const onCommit = vi.fn();
    const onBlur = vi.fn();
    const { container } = renderUi(
      <ColourInput defaultValue="#112233" onCommit={onCommit} onBlur={onBlur} />,
    );
    pick(container, "#FF8800");
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.focusOut(swatch(container));
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("#ff8800");
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("tabbing through the swatch without a pick does not blur or commit the text input", () => {
    const onCommit = vi.fn();
    const onBlur = vi.fn();
    const { container } = renderUi(
      <ColourInput defaultValue="#112233" onCommit={onCommit} onBlur={onBlur} />,
    );
    fireEvent.focusOut(swatch(container));
    expect(onCommit).not.toHaveBeenCalled();
    expect(onBlur).not.toHaveBeenCalled();
  });
});

describe("ColourInput: the empty state", () => {
  it("dims only the swatch's colour, so the border and focus ring stay full strength", () => {
    const { container } = renderUi(<ColourInput />);
    const classes = swatch(container).className.split(/\s+/);
    expect(classes.some((c) => /^data-\[empty\]:opacity-/.test(c))).toBe(false);
    expect(
      classes.some((c) => c.startsWith("data-[empty]:[&::-webkit-color-swatch]:opacity-")),
    ).toBe(true);
    expect(classes.some((c) => c.startsWith("data-[empty]:[&::-moz-color-swatch]:opacity-"))).toBe(
      true,
    );
  });
});
