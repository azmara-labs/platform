import { act, createRef, useState } from "react";
import { useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../react/LocaleProvider.js";
import {
  describeDebounceContract,
  expectNoA11yViolations,
  renderUi,
  setupUser,
} from "../../test-utils/index.js";
import { Button } from "../button/button.js";
import { Field } from "../field/field.js";
import { InputGroup, InputGroupAddon } from "../input-group/input-group.js";
import { MoneyField, NumberField, numberOrNull } from "./index.js";

// The visible input; Base UI keeps the raw number in a second, hidden one.
const visible = (container: HTMLElement) =>
  container.querySelector("input:not([aria-hidden])") as HTMLInputElement;
const hiddenInput = (container: HTMLElement) =>
  container.querySelector('input[aria-hidden="true"]') as HTMLInputElement;
// Intl uses non-breaking spaces in some locales; compare with plain ones.
const text = (input: HTMLInputElement) => input.value.replace(/\s/g, " ");

describeDebounceContract("NumberField", {
  render: (props) => {
    const { container, unmount } = renderUi(<NumberField aria-label="Quantity" {...props} />);
    return { input: visible(container), unmount };
  },
  sample: { text: "42", value: 42 },
});

describeDebounceContract("MoneyField", {
  render: (props) => {
    const { container, unmount } = renderUi(<MoneyField aria-label="Amount" {...props} />);
    return { input: visible(container), unmount };
  },
  sample: { text: "12.5", value: 12.5 },
});

describe("NumberField: value", () => {
  it("reports real numbers, and null when emptied", async () => {
    const user = setupUser();
    const onValueChange = vi.fn();
    const { container } = renderUi(
      <NumberField aria-label="Quantity" defaultValue={3} onValueChange={onValueChange} />,
    );
    const input = visible(container);
    expect(input.value).toBe("3");
    await user.clear(input);
    expect(onValueChange).toHaveBeenLastCalledWith(null);
    await user.type(input, "1234");
    expect(onValueChange).toHaveBeenLastCalledWith(1234);
    for (const [value] of onValueChange.mock.calls) {
      expect(value === null || typeof value === "number").toBe(true);
    }
  });

  it("formats with grouping and decimals for the locale on blur", async () => {
    const user = setupUser();
    const { container } = renderUi(<NumberField aria-label="Units" decimalScale={2} />);
    const input = visible(container);
    await user.type(input, "1234567.891");
    act(() => input.blur());
    expect(text(input)).toBe("1,234,567.89");
    expect(hiddenInput(container).value).toBe("1234567.89");
  });

  it("follows a LocaleProvider, and grouping can be turned off", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <LocaleProvider locale="de-DE">
        <NumberField aria-label="Menge" defaultValue={1234.5} decimalScale={2} />
        <NumberField aria-label="Code" defaultValue={12345} grouping={false} />
      </LocaleProvider>,
    );
    const [german, code] = Array.from(
      container.querySelectorAll("input:not([aria-hidden])"),
    ) as HTMLInputElement[];
    expect(text(german as HTMLInputElement)).toBe("1.234,5");
    expect((code as HTMLInputElement).value).toBe("12345");
    await user.clear(german as HTMLInputElement);
    await user.type(german as HTMLInputElement, "2,75");
    act(() => (german as HTMLInputElement).blur());
    expect(hiddenInput(container).value).toBe("2.75");
  });

  it("works controlled", async () => {
    const user = setupUser();
    function Controlled() {
      const [value, setValue] = useState<number | null>(5);
      return (
        <>
          <NumberField aria-label="n" value={value} onValueChange={setValue} />
          <output>{String(value)}</output>
        </>
      );
    }
    const { container } = renderUi(<Controlled />);
    await user.type(visible(container), "0");
    expect(container.querySelector("output")?.textContent).toBe("50");
  });
});

describe("NumberField: controlled with debounceMs", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const user = () => setupUser({ advanceTimers: vi.advanceTimersByTime, delay: null });
  const tick = (ms: number) =>
    act(() => {
      vi.advanceTimersByTime(ms);
    });

  // The parent only learns the number when the wait ends.
  function Guests({ onChange }: { onChange: (n: number | null) => void }) {
    const [n, setN] = useState<number | null>(1);
    return (
      <>
        <NumberField
          aria-label="Guests"
          value={n}
          stepper
          debounceMs={300}
          onValueChange={(next) => {
            setN(next);
            onChange(next);
          }}
        />
        <Button onClick={() => setN(null)}>Clear</Button>
      </>
    );
  }
  const increase = (container: HTMLElement) =>
    container.querySelector('button[aria-label="Increase"]') as HTMLButtonElement;

  it("shows what the person types while the parent's update waits", async () => {
    const onChange = vi.fn();
    const { container } = renderUi(<Guests onChange={onChange} />);
    await user().type(visible(container), "2");
    expect(visible(container).value).toBe("12");
    tick(300);
    expect(onChange.mock.calls).toEqual([[12]]);
    expect(visible(container).value).toBe("12");
  });

  it("steps from the shown number; each step is a commit, so it is sent at once", async () => {
    const onChange = vi.fn();
    const { container } = renderUi(<Guests onChange={onChange} />);
    const u = user();
    await u.click(increase(container));
    await u.click(increase(container));
    await u.click(increase(container));
    expect(visible(container).value).toBe("4");
    expect(onChange.mock.calls).toEqual([[2], [3], [4]]);
  });

  it("drops a waiting edit when the parent sets a value from outside", async () => {
    const onChange = vi.fn();
    const { container } = renderUi(<Guests onChange={onChange} />);
    await user().type(visible(container), "5");
    expect(visible(container).value).toBe("15");
    // Press Clear without moving focus, which would commit the waiting number first.
    const clear = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Clear",
    ) as HTMLButtonElement;
    act(() => clear.click());
    // Base UI keeps the focused field's text; what matters is that 15 never reaches the parent.
    tick(300);
    expect(onChange).not.toHaveBeenCalled();
    expect(hiddenInput(container).value).toBe("");
  });
});

describe("NumberField: min, max, step and clamp", () => {
  it("clamps a negative amount to the minimum of 0 when committed", async () => {
    const user = setupUser();
    const onCommit = vi.fn();
    const { container } = renderUi(<NumberField aria-label="Qty" min={0} onCommit={onCommit} />);
    const input = visible(container);
    await user.click(input);
    await user.paste("-5");
    act(() => input.blur());
    expect(hiddenInput(container).value).toBe("0");
    expect(input.value).toBe("0");
    expect(onCommit).toHaveBeenLastCalledWith(0);
  });

  it("submits the clamped number on Enter, before any blur", async () => {
    const user = setupUser();
    const values: string[] = [];
    const { container } = renderUi(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          values.push(hiddenInput(container).value);
        }}
      >
        <NumberField aria-label="Hours" min={0} max={40} name="hours" />
        <button type="submit">Save</button>
      </form>,
    );
    await user.type(visible(container), "55{Enter}");
    expect(values).toEqual(["40"]);
    // Base UI clamps the stored number as it is typed or pasted; only the text waits for blur.
    await user.clear(visible(container));
    await user.paste("-3");
    await user.keyboard("{Enter}");
    expect(values).toEqual(["40", "0"]);
  });

  it("commits once for Enter followed by blur", async () => {
    const user = setupUser();
    const onCommit = vi.fn();
    const { container } = renderUi(<NumberField aria-label="n" onCommit={onCommit} />);
    await user.type(visible(container), "8{Enter}");
    act(() => visible(container).blur());
    expect(onCommit.mock.calls).toEqual([[8]]);
  });

  it("reads string limits as numbers, as register() may pass them", async () => {
    const user = setupUser();
    const { container } = renderUi(<NumberField aria-label="n" min="1" max="9" />);
    await user.type(visible(container), "42");
    act(() => visible(container).blur());
    expect(hiddenInput(container).value).toBe("9");
  });

  it("keeps out-of-range values with clamp={false}", async () => {
    const user = setupUser();
    const { container } = renderUi(<NumberField aria-label="Temp" max={10} clamp={false} />);
    await user.type(visible(container), "25");
    act(() => visible(container).blur());
    expect(hiddenInput(container).value).toBe("25");
  });

  it("blocks negatives with allowNegative={false}", async () => {
    const user = setupUser();
    const { container } = renderUi(<NumberField aria-label="Qty" allowNegative={false} />);
    await user.click(visible(container));
    await user.paste("-12");
    act(() => visible(container).blur());
    expect(Number(hiddenInput(container).value)).toBeGreaterThanOrEqual(0);
  });

  it("steps with the arrow keys and the stepper buttons, and commits each step", async () => {
    const user = setupUser();
    const onCommit = vi.fn();
    const { container } = renderUi(
      <NumberField
        aria-label="Guests"
        defaultValue={2}
        step={2}
        max={6}
        stepper
        onCommit={onCommit}
      />,
    );
    await user.click(visible(container));
    await user.keyboard("{ArrowUp}");
    expect(hiddenInput(container).value).toBe("4");
    await user.click(container.querySelector('button[aria-label="Increase"]') as HTMLButtonElement);
    expect(hiddenInput(container).value).toBe("6");
    await user.click(container.querySelector('button[aria-label="Increase"]') as HTMLButtonElement);
    expect(hiddenInput(container).value).toBe("6");
    await user.click(container.querySelector('button[aria-label="Decrease"]') as HTMLButtonElement);
    expect(hiddenInput(container).value).toBe("4");
    expect(onCommit.mock.calls.map((call) => call[0])).toEqual([4, 6, 4]);
  });

  it("takes a step of 10 with Shift and 0.1 with Alt", async () => {
    const user = setupUser();
    const { container } = renderUi(<NumberField aria-label="n" defaultValue={5} />);
    await user.click(visible(container));
    await user.keyboard("{Shift>}{ArrowUp}{/Shift}");
    expect(hiddenInput(container).value).toBe("15");
    await user.keyboard("{Alt>}{ArrowUp}{/Alt}");
    expect(hiddenInput(container).value).toBe("15.1");
  });

  it("ignores the mouse wheel unless allowWheelScrub is set", async () => {
    const user = setupUser();
    const { container } = renderUi(<NumberField aria-label="n" defaultValue={5} />);
    await user.click(visible(container));
    act(() => {
      visible(container).dispatchEvent(
        new WheelEvent("wheel", { deltaY: -100, bubbles: true, cancelable: true }),
      );
    });
    expect(hiddenInput(container).value).toBe("5");
  });

  it("doesn't commit on Enter while an input method is composing", async () => {
    const user = setupUser();
    const onCommit = vi.fn();
    const { container } = renderUi(<NumberField aria-label="n" onCommit={onCommit} />);
    await user.type(visible(container), "7");
    act(() => {
      visible(container).dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true, isComposing: true }),
      );
    });
    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe("MoneyField", () => {
  it("formats NZD for en-NZ by default and reports the amount as a number", async () => {
    const user = setupUser();
    const onCommit = vi.fn();
    const { container } = renderUi(<MoneyField aria-label="Amount" onCommit={onCommit} />);
    const input = visible(container);
    await user.type(input, "1234.5");
    act(() => input.blur());
    expect(text(input)).toBe("$1,234.50");
    expect(onCommit).toHaveBeenLastCalledWith(1234.5);
  });

  it("rounds to the currency's minor unit and shows a code when asked", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <>
        <MoneyField aria-label="NZD" currencyDisplay="code" defaultValue={10} />
        <MoneyField aria-label="Yen" currency="JPY" />
      </>,
    );
    const [nzd, yen] = Array.from(
      container.querySelectorAll("input:not([aria-hidden])"),
    ) as HTMLInputElement[];
    expect(text(nzd as HTMLInputElement)).toBe("NZD 10.00");
    await user.type(yen as HTMLInputElement, "1500.6");
    act(() => (yen as HTMLInputElement).blur());
    expect(text(yen as HTMLInputElement)).toBe("JP¥1,501");
  });

  it("parses a pasted, formatted amount", async () => {
    const user = setupUser();
    const onValueChange = vi.fn();
    const { container } = renderUi(
      <MoneyField aria-label="Amount" onValueChange={onValueChange} />,
    );
    await user.click(visible(container));
    await user.paste("$2,499.99");
    expect(onValueChange).toHaveBeenLastCalledWith(2499.99);
  });
});

describe("NumberField: in a Field, an InputGroup and a form", () => {
  it("is labelled by the Field and gets required and the error", () => {
    const { container } = renderUi(
      <Field label="Quantity" required description="Whole boxes." error="Enter a quantity">
        <NumberField />
      </Field>,
    );
    const input = visible(container);
    expect((container.querySelector("label") as HTMLLabelElement).htmlFor).toBe(input.id);
    expect(input.getAttribute("aria-required")).toBe("true");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(
      document.getElementById(input.getAttribute("aria-errormessage") ?? "")?.textContent,
    ).toBe("Enter a quantity");
  });

  it("sits inside an InputGroup without its own border and is described by the addon", () => {
    const { container } = renderUi(
      <InputGroup>
        <NumberField aria-label="Weight" decimalScale={1} />
        <InputGroupAddon>kg</InputGroupAddon>
      </InputGroup>,
    );
    const input = visible(container);
    const ids = (input.getAttribute("aria-describedby") ?? "").split(" ");
    expect(ids.map((id) => document.getElementById(id)?.textContent)).toEqual(["kg"]);
    const group = input.parentElement as HTMLElement;
    expect(group.className).not.toContain("border-input");
  });

  it("gets required and the error from a Field around its InputGroup", () => {
    const { container } = renderUi(
      <Field label="Weight" required error="Enter a weight">
        <InputGroup>
          <NumberField />
          <InputGroupAddon>kg</InputGroupAddon>
        </InputGroup>
      </Field>,
    );
    const input = visible(container);
    expect(input.getAttribute("aria-required")).toBe("true");
    expect(
      document.getElementById(input.getAttribute("aria-errormessage") ?? "")?.textContent,
    ).toBe("Enter a weight");
  });

  it("tells React Hook Form about each new number as it is typed, without a blur", async () => {
    function Live() {
      const { register, watch } = useForm<{ hours: number | null }>({
        mode: "onChange",
        defaultValues: { hours: null },
      });
      return (
        <>
          <NumberField aria-label="Hours" {...register("hours", { setValueAs: numberOrNull })} />
          <output>{JSON.stringify(watch("hours"))}</output>
        </>
      );
    }
    const user = setupUser();
    const { container } = renderUi(<Live />);
    await user.type(visible(container), "37");
    await vi.waitFor(() => expect(container.querySelector("output")?.textContent).toBe("37"));
    expect(document.activeElement).toBe(visible(container));
  });

  it("forwards the ref to the named hidden input, whose focus moves to the visible one", () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = renderUi(<NumberField ref={ref} aria-label="n" name="qty" />);
    expect(ref.current).toBe(hiddenInput(container));
    expect(ref.current?.name).toBe("qty");
    act(() => ref.current?.focus());
    expect(document.activeElement).toBe(visible(container));
  });

  it("works with register() and no Controller: numbers, defaults, clamp and focus on error", async () => {
    type Values = { quantity: number | null; price: number | null };
    const onSave = vi.fn();
    function OrderForm() {
      const {
        register,
        handleSubmit,
        formState: { errors },
      } = useForm<Values>({ defaultValues: { quantity: 3, price: null } });
      return (
        <form noValidate onSubmit={handleSubmit(onSave)}>
          <Field label="Quantity">
            <NumberField {...register("quantity", { setValueAs: numberOrNull })} min={0} />
          </Field>
          <Field label="Price" error={errors.price?.message}>
            <MoneyField
              {...register("price", {
                setValueAs: numberOrNull,
                validate: (value) => (value === null ? "Enter a price" : true),
              })}
            />
          </Field>
          <Button type="submit">Save</Button>
        </form>
      );
    }
    const user = setupUser();
    const { container } = renderUi(<OrderForm />);
    const [quantity, price] = Array.from(
      container.querySelectorAll("input:not([aria-hidden])"),
    ) as HTMLInputElement[];
    await vi.waitFor(() => expect((quantity as HTMLInputElement).value).toBe("3"));

    const submit = container.querySelector("button[type=submit]") as HTMLButtonElement;
    await user.click(submit);
    await vi.waitFor(() => expect(container.textContent).toContain("Enter a price"));
    expect(onSave).not.toHaveBeenCalled();
    // React Hook Form focuses the first invalid field through its ref: the visible input.
    expect(document.activeElement).toBe(price);

    await user.type(price as HTMLInputElement, "19.9");
    await user.clear(quantity as HTMLInputElement);
    await user.click(quantity as HTMLInputElement);
    await user.paste("-4");
    await user.click(submit);
    await vi.waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0]?.[0]).toEqual({ quantity: 0, price: 19.9 });
  });

  it("passes axe with a stepper, in a Field", async () => {
    const { container } = renderUi(
      <form>
        <Field label="Guests" description="Up to 6." required>
          <NumberField stepper min={1} max={6} defaultValue={2} />
        </Field>
        <Field label="Deposit">
          <MoneyField defaultValue={150} />
        </Field>
      </form>,
    );
    await expectNoA11yViolations(container);
  });
});

describe("numberOrNull", () => {
  it("turns the hidden input's text into a number or null", () => {
    expect(numberOrNull("")).toBeNull();
    expect(numberOrNull(undefined)).toBeNull();
    expect(numberOrNull("abc")).toBeNull();
    expect(numberOrNull("12.5")).toBe(12.5);
    expect(numberOrNull(7)).toBe(7);
    expect(numberOrNull("-0")).toBe(-0);
  });
});
