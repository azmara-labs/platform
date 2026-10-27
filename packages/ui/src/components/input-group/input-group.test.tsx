import { act, createRef, useState } from "react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { Button } from "../button/button.js";
import { Field } from "../field/field.js";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "./index.js";

const input = (container: HTMLElement) => container.querySelector("input") as HTMLInputElement;
const group = (container: HTMLElement) =>
  container.querySelector('[data-slot="input-group"]') as HTMLElement;
const describedBy = (el: Element) =>
  (el.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent);

const SearchIcon = () => (
  <svg aria-hidden="true" data-testid="icon" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8" />
  </svg>
);

describe("InputGroup: input", () => {
  it("forwards the ref to the real <input>", () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = renderUi(
      <InputGroup>
        <InputGroupAddon>NZ$</InputGroupAddon>
        <InputGroupInput ref={ref} name="amount" />
      </InputGroup>,
    );
    expect(ref.current).toBe(input(container));
    expect(ref.current?.name).toBe("amount");
  });

  it("follows the density tokens, and the group draws the border and focus ring", () => {
    const { container } = renderUi(
      <InputGroup className="max-w-xs">
        <InputGroupInput />
      </InputGroup>,
    );
    const classes = group(container).className.split(/\s+/);
    expect(classes).toContain("h-(--density-control-height)");
    expect(classes).toContain("border");
    expect(classes).toContain("has-[input:focus-visible]:ring-2");
    expect(classes).toContain("max-w-xs");
    const own = input(container).className.split(/\s+/);
    expect(own).toContain("border-0");
    expect(own).toContain("focus-visible:ring-0");
    expect(own).not.toContain("focus-visible:ring-2");
  });
});

describe("InputGroup: addons", () => {
  it("adds text addons to the input's description, ahead of the field's own", () => {
    const { container } = renderUi(
      <Field label="Price" description="Including GST." error="Enter a price">
        <InputGroup>
          <InputGroupAddon>NZD</InputGroupAddon>
          <InputGroupInput />
          <InputGroupAddon>per month</InputGroupAddon>
        </InputGroup>
      </Field>,
    );
    expect(describedBy(input(container))).toEqual([
      "NZD",
      "per month",
      "Including GST.",
      "Enter a price",
    ]);
  });

  it("hides icon addons from screen readers and leaves them out of the description", () => {
    const { container } = renderUi(
      <InputGroup>
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput aria-label="Search" />
      </InputGroup>,
    );
    const addon = container.querySelector('[data-slot="input-group-addon"]') as HTMLElement;
    expect(addon.getAttribute("aria-hidden")).toBe("true");
    expect(input(container).hasAttribute("aria-describedby")).toBe(false);
  });

  it("follows describe when given, and keeps an aria-describedby set on the input", () => {
    const { container } = renderUi(
      <>
        <p id="hint">Hint</p>
        <InputGroup>
          <InputGroupAddon describe>
            <strong>kg</strong>
          </InputGroupAddon>
          <InputGroupInput aria-describedby="hint" />
          <InputGroupAddon describe={false}>decor</InputGroupAddon>
        </InputGroup>
      </>,
    );
    expect(describedBy(input(container))).toEqual(["kg", "Hint"]);
  });

  it("drops an addon from the description when it unmounts", () => {
    function Toggle() {
      const [unit, setUnit] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setUnit(false)}>
            hide
          </button>
          <InputGroup>
            <InputGroupInput aria-label="Weight" />
            {unit ? <InputGroupAddon>kg</InputGroupAddon> : null}
          </InputGroup>
        </>
      );
    }
    const { container } = renderUi(<Toggle />);
    expect(describedBy(input(container))).toEqual(["kg"]);
    act(() => (container.querySelector("button") as HTMLButtonElement).click());
    expect(input(container).hasAttribute("aria-describedby")).toBe(false);
  });

  it("reads addons in the order they appear, even one that mounts later", () => {
    function Late() {
      const [currency, setCurrency] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setCurrency(true)}>
            show
          </button>
          <InputGroup>
            {currency ? <InputGroupAddon>NZD</InputGroupAddon> : null}
            <InputGroupInput aria-label="Price" />
            <InputGroupAddon>per month</InputGroupAddon>
          </InputGroup>
        </>
      );
    }
    const { container } = renderUi(<Late />);
    expect(describedBy(input(container))).toEqual(["per month"]);
    act(() => (container.querySelector("button") as HTMLButtonElement).click());
    expect(describedBy(input(container))).toEqual(["NZD", "per month"]);
  });

  it("focuses the input when an addon is pressed, but not when a button is", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <InputGroup>
        <InputGroupAddon>NZ$</InputGroupAddon>
        <InputGroupInput aria-label="Amount" />
        <InputGroupButton>Max</InputGroupButton>
      </InputGroup>,
    );
    await user.click(container.querySelector('[data-slot="input-group-addon"]') as HTMLElement);
    expect(document.activeElement).toBe(input(container));
    await user.click(container.querySelector("button") as HTMLButtonElement);
    expect(document.activeElement).toBe(container.querySelector("button"));
  });

  it("leaves a disabled input alone", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <InputGroup>
        <InputGroupAddon>NZ$</InputGroupAddon>
        <InputGroupInput aria-label="Amount" disabled />
      </InputGroup>,
    );
    await user.click(container.querySelector('[data-slot="input-group-addon"]') as HTMLElement);
    expect(document.activeElement).not.toBe(input(container));
  });
});

describe("InputGroup: buttons", () => {
  it("are type=button, so they never submit, and come after the input in tab order", async () => {
    const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
    const onClear = vi.fn();
    const user = setupUser();
    const { container } = renderUi(
      <form onSubmit={(event) => onSubmit(event.nativeEvent as SubmitEvent)}>
        <InputGroup>
          <InputGroupInput aria-label="Search" />
          <InputGroupButton size="icon" aria-label="Clear search" onClick={onClear}>
            ×
          </InputGroupButton>
        </InputGroup>
      </form>,
    );
    const clear = container.querySelector("button") as HTMLButtonElement;
    expect(clear.type).toBe("button");
    await user.tab();
    expect(document.activeElement).toBe(input(container));
    await user.tab();
    expect(document.activeElement).toBe(clear);
    await user.keyboard("{Enter}");
    expect(onClear).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("use the ghost style and accept a variant", () => {
    const { container } = renderUi(
      <InputGroup>
        <InputGroupInput aria-label="Code" />
        <InputGroupButton>Copy</InputGroupButton>
        <InputGroupButton variant="secondary">Apply</InputGroupButton>
      </InputGroup>,
    );
    const [copy, apply] = Array.from(container.querySelectorAll("button"));
    expect(copy?.className).toContain("hover:bg-accent");
    expect(apply?.className).toContain("bg-secondary");
  });
});

describe("InputGroup: inside a Field", () => {
  it("labels the input and passes required and the error message to it, not the group", () => {
    const { container } = renderUi(
      <Field label="Amount" required error="Enter an amount">
        <InputGroup>
          <InputGroupAddon>NZ$</InputGroupAddon>
          <InputGroupInput />
        </InputGroup>
      </Field>,
    );
    const control = input(container);
    expect((container.querySelector("label") as HTMLLabelElement).htmlFor).toBe(control.id);
    expect(control.getAttribute("aria-required")).toBe("true");
    expect(control.getAttribute("aria-invalid")).toBe("true");
    expect(
      document.getElementById(control.getAttribute("aria-errormessage") ?? "")?.textContent,
    ).toBe("Enter an amount");
    for (const attribute of ["aria-required", "aria-errormessage", "aria-invalid"]) {
      expect(group(container).hasAttribute(attribute)).toBe(false);
    }
    expect(group(container).className).toContain(
      "has-[input[aria-invalid=true]]:border-destructive",
    );
  });

  it("works with react-hook-form's register() and no Controller", async () => {
    type Values = { amount: string };
    const onSave = vi.fn();
    function PriceForm() {
      const {
        register,
        handleSubmit,
        formState: { errors },
      } = useForm<Values>({ defaultValues: { amount: "" } });
      return (
        <form noValidate onSubmit={handleSubmit(onSave)}>
          <Field label="Amount" error={errors.amount?.message}>
            <InputGroup>
              <InputGroupAddon>NZ$</InputGroupAddon>
              <InputGroupInput
                inputMode="decimal"
                {...register("amount", { required: "Enter an amount" })}
              />
            </InputGroup>
          </Field>
          <Button type="submit">Save</Button>
        </form>
      );
    }
    const user = setupUser();
    const { container } = renderUi(<PriceForm />);
    const submit = container.querySelector("button[type=submit]") as HTMLButtonElement;
    await user.click(submit);
    await vi.waitFor(() => expect(input(container).getAttribute("aria-invalid")).toBe("true"));
    await user.type(input(container), "49.95");
    await user.click(submit);
    await vi.waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0]?.[0]).toEqual({ amount: "49.95" });
  });

  it("passes axe with text, icon and button addons", async () => {
    const { container } = renderUi(
      <form>
        <Field label="Price" required description="Including GST." error="Enter a price">
          <InputGroup>
            <InputGroupAddon>NZ$</InputGroupAddon>
            <InputGroupInput inputMode="decimal" />
          </InputGroup>
        </Field>
        <Field label="Search">
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput type="search" />
            <InputGroupButton size="icon" aria-label="Clear search">
              ×
            </InputGroupButton>
          </InputGroup>
        </Field>
      </form>,
    );
    await expectNoA11yViolations(container);
  });
});
