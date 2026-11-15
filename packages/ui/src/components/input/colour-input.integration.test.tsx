import { fireEvent, screen } from "@testing-library/dom";
import { act } from "react";
import { type UseFormReturn, useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { Field } from "../field/field.js";
import { ColourInput } from "./colour-input.js";

const text = (container: HTMLElement) =>
  container.querySelector('input[type="text"]') as HTMLInputElement;
const swatch = (container: HTMLElement) =>
  container.querySelector('input[type="color"]') as HTMLInputElement;
const byId = (id: string | null) => (id ? document.getElementById(id) : null);
const describedBy = (el: Element) =>
  (el.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter(Boolean)
    .map((id) => byId(id)?.textContent);

describe("ColourInput in a Field", () => {
  it("labels the text input, not the swatch", () => {
    const { container } = renderUi(
      <Field label="Brand colour">
        <ColourInput />
      </Field>,
    );
    expect(screen.getByLabelText("Brand colour")).toBe(text(container));
    expect(screen.getByLabelText("Choose a colour")).toBe(swatch(container));
  });

  it("describes the text input with the description", () => {
    const { container } = renderUi(
      <Field label="Brand colour" description="A hex colour, such as #1f7a5c.">
        <ColourInput />
      </Field>,
    );
    expect(describedBy(text(container))).toEqual(["A hex colour, such as #1f7a5c."]);
  });

  it("a disabled Field disables the swatch too, and a pick changes nothing", () => {
    const { container } = renderUi(
      <Field label="Brand colour" disabled>
        <ColourInput defaultValue="#112233" />
      </Field>,
    );
    expect(text(container).disabled).toBe(true);
    expect(swatch(container).disabled).toBe(true);
    fireEvent.change(swatch(container), { target: { value: "#ff8800" } });
    expect(text(container).value).toBe("#112233");
  });

  it("marks the text input invalid and points at the error", () => {
    const { container } = renderUi(
      <Field label="Brand colour" error="Use a hex colour">
        <ColourInput defaultValue="red" />
      </Field>,
    );
    const input = text(container);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(byId(input.getAttribute("aria-errormessage"))?.textContent).toBe("Use a hex colour");
  });
});

describe("ColourInput with react-hook-form", () => {
  type Values = { brand: string };
  let form: UseFormReturn<Values>;

  function Harness({ initial = "#1F7A5C" }: { initial?: string }) {
    form = useForm<Values>({ defaultValues: { brand: initial } });
    return (
      <form>
        <ColourInput {...form.register("brand")} />
        <output data-testid="dirty">{JSON.stringify(form.formState.dirtyFields)}</output>
      </form>
    );
  }

  it("shows the default on first paint", () => {
    const { container } = renderUi(<Harness />);
    expect(text(container).value).toBe("#1F7A5C");
    expect(swatch(container).value).toBe("#1f7a5c");
  });

  it("a pick updates the form value and marks it dirty", () => {
    const { container } = renderUi(<Harness />);
    fireEvent.change(swatch(container), { target: { value: "#FF8800" } });
    expect(form.getValues("brand")).toBe("#ff8800");
    expect(screen.getByTestId("dirty").textContent).toBe('{"brand":true}');
  });

  it("typing updates the form value", async () => {
    const user = setupUser();
    const { container } = renderUi(<Harness initial="" />);
    await user.type(text(container), "#0f4c5c");
    expect(form.getValues("brand")).toBe("#0f4c5c");
    expect(swatch(container).value).toBe("#0f4c5c");
  });

  it("a native form reset moves the swatch back", async () => {
    const { container } = renderUi(
      <form>
        <ColourInput defaultValue="#112233" />
      </form>,
    );
    fireEvent.change(swatch(container), { target: { value: "#ff8800" } });
    expect(swatch(container).value).toBe("#ff8800");
    await act(async () => {
      (container.querySelector("form") as HTMLFormElement).reset();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(text(container).value).toBe("#112233");
    expect(swatch(container).value).toBe("#112233");
  });

  it("reset() moves the swatch", () => {
    const { container } = renderUi(<Harness />);
    act(() => form.reset({ brand: "#0F4C5C" }));
    expect(text(container).value).toBe("#0F4C5C");
    expect(swatch(container).value).toBe("#0f4c5c");
  });
});

describe("ColourInput accessibility", () => {
  it("has no axe violations on its own, in a Field, and disabled", async () => {
    const { container } = renderUi(
      <div>
        <ColourInput aria-label="Accent colour" />
        <Field label="Brand colour" description="A hex colour." error="Use a hex colour">
          <ColourInput defaultValue="red" />
        </Field>
        <ColourInput aria-label="Locked colour" disabled defaultValue="#112233" />
      </div>,
    );
    await expectNoA11yViolations(container);
  });

  it("Tab moves from the swatch to the text input", async () => {
    const user = setupUser();
    const { container } = renderUi(<ColourInput />);
    await user.tab();
    expect(document.activeElement).toBe(swatch(container));
    await user.tab();
    expect(document.activeElement).toBe(text(container));
  });
});
