import { act, useState } from "react";
import { useForm, useFormState } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { Button } from "../button/button.js";
import { Input } from "../input/input.js";
import { MoneyField, numberOrNull } from "../number-field/number-field.js";
import { zodResolver } from "../zod/resolver.js";
import { Form, FormErrorSummary, FormField } from "./index.js";

const inputByLabel = (container: HTMLElement, text: string) => {
  const label = Array.from(container.querySelectorAll("label")).find((l) =>
    l.textContent?.startsWith(text),
  ) as HTMLLabelElement;
  return document.getElementById(label.htmlFor) as HTMLInputElement;
};
const submit = (container: HTMLElement) =>
  container.querySelector("button[type=submit]") as HTMLButtonElement;

describe("Form and FormField with register()", () => {
  type Values = { name: string; email: string };

  function Profile({ onSave }: { onSave: (values: Values) => void }) {
    const form = useForm<Values>({ defaultValues: { name: "", email: "" } });
    return (
      <Form form={form} onSubmit={onSave}>
        <FormField name="name" label="Name" rules={{ required: "Enter your name" }}>
          <Input />
        </FormField>
        <FormField
          name="email"
          label="Email"
          description="For receipts."
          rules={{
            required: "Enter your email address",
            pattern: { value: /@/, message: "Enter an email address like aroha@example.co.nz" },
          }}
        >
          <Input type="email" />
        </FormField>
        <Button type="submit">Save</Button>
      </Form>
    );
  }

  it("renders a noValidate form, registers the real input, and shows the required marker", () => {
    const { container } = renderUi(<Profile onSave={vi.fn()} />);
    const form = container.querySelector("form") as HTMLFormElement;
    expect(form.noValidate).toBe(true);
    const name = inputByLabel(container, "Name");
    expect(name.name).toBe("name");
    expect(name.getAttribute("aria-required")).toBe("true");
    expect(container.querySelector("label [aria-hidden]")?.textContent).toBe("*");
  });

  it("shows each field's error on a failed submit, then submits once fixed", async () => {
    const onSave = vi.fn();
    const user = setupUser();
    const { container } = renderUi(<Profile onSave={onSave} />);
    await user.click(submit(container));
    await vi.waitFor(() => expect(container.textContent).toContain("Enter your name"));
    const email = inputByLabel(container, "Email");
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(
      document.getElementById(email.getAttribute("aria-errormessage") ?? "")?.textContent,
    ).toBe("Enter your email address");
    expect(onSave).not.toHaveBeenCalled();

    await user.type(inputByLabel(container, "Name"), "Aroha");
    await user.type(email, "aroha");
    await user.click(submit(container));
    await vi.waitFor(() =>
      expect(container.textContent).toContain("Enter an email address like aroha@example.co.nz"),
    );
    await user.type(email, "@example.co.nz");
    await user.click(submit(container));
    await vi.waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0]?.[0]).toEqual({ name: "Aroha", email: "aroha@example.co.nz" });
    expect(email.hasAttribute("aria-invalid")).toBe(false);
  });

  it("tracks dirty and touched through the real input", async () => {
    let state: { dirty: boolean; touched: boolean } = { dirty: false, touched: false };
    function Tracked() {
      const form = useForm<{ city: string }>({ defaultValues: { city: "Hamilton" } });
      return (
        <Form form={form} onSubmit={vi.fn()}>
          <FormField name="city" label="City">
            <Input />
          </FormField>
          <Probe />
        </Form>
      );
    }
    function Probe() {
      const { dirtyFields, touchedFields } = useFormState<{ city: string }>();
      state = { dirty: Boolean(dirtyFields.city), touched: Boolean(touchedFields.city) };
      return null;
    }
    const user = setupUser();
    const { container } = renderUi(<Tracked />);
    const city = inputByLabel(container, "City");
    expect(city.value).toBe("Hamilton");
    await user.click(city);
    act(() => city.blur());
    await vi.waitFor(() => expect(state).toEqual({ dirty: false, touched: true }));
    await user.type(city, " East");
    await vi.waitFor(() => expect(state.dirty).toBe(true));
    await user.clear(city);
    await user.type(city, "Hamilton");
    await vi.waitFor(() => expect(state.dirty).toBe(false));
  });

  it("keeps the child's own onChange and onBlur", async () => {
    const onChange = vi.fn();
    const onBlur = vi.fn();
    function Chained() {
      const form = useForm<{ code: string }>({ defaultValues: { code: "" } });
      return (
        <Form form={form} onSubmit={vi.fn()}>
          <FormField name="code" label="Code">
            <Input onChange={onChange} onBlur={onBlur} />
          </FormField>
        </Form>
      );
    }
    const user = setupUser();
    const { container } = renderUi(<Chained />);
    await user.type(inputByLabel(container, "Code"), "ab");
    act(() => inputByLabel(container, "Code").blur());
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("works with a NumberField through rules.setValueAs", async () => {
    const onSave = vi.fn();
    function Price() {
      const form = useForm<{ price: number | null }>({ defaultValues: { price: 25 } });
      return (
        <Form form={form} onSubmit={onSave}>
          <FormField name="price" label="Price" rules={{ setValueAs: numberOrNull }}>
            <MoneyField />
          </FormField>
          <Button type="submit">Save</Button>
        </Form>
      );
    }
    const user = setupUser();
    const { container } = renderUi(<Price />);
    const price = container.querySelector("input:not([aria-hidden])") as HTMLInputElement;
    await vi.waitFor(() => expect(price.value).toBe("$25.00"));
    await user.clear(price);
    await user.type(price, "19.5");
    await user.click(submit(container));
    await vi.waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0]?.[0]).toEqual({ price: 19.5 });
  });
});

describe("FormField controlled", () => {
  it("passes value and onValueChange to a child without an input ref", async () => {
    const onSave = vi.fn();
    function Toggle({
      value,
      onValueChange,
      onBlur,
    }: {
      value?: boolean;
      onValueChange?: (value: boolean) => void;
      onBlur?: () => void;
    }) {
      return (
        <button
          type="button"
          aria-pressed={value}
          onClick={() => onValueChange?.(!value)}
          onBlur={onBlur}
        >
          Subscribe
        </button>
      );
    }
    function Prefs() {
      const form = useForm<{ subscribe: boolean }>({ defaultValues: { subscribe: false } });
      return (
        <Form form={form} onSubmit={onSave}>
          <FormField name="subscribe" label="Newsletter" controlled>
            <Toggle />
          </FormField>
          <Button type="submit">Save</Button>
        </Form>
      );
    }
    const user = setupUser();
    const { container } = renderUi(<Prefs />);
    const toggle = container.querySelector("button[aria-pressed]") as HTMLButtonElement;
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    await user.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    await user.click(submit(container));
    await vi.waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0]?.[0]).toEqual({ subscribe: true });
  });

  it("renders from render() and shows the controller's error", async () => {
    function Terms() {
      const form = useForm<{ terms: boolean }>({ defaultValues: { terms: false } });
      return (
        <Form form={form} onSubmit={vi.fn()}>
          <FormField
            name="terms"
            label="Terms"
            rules={{ validate: (value) => value || "Accept the terms to continue" }}
            render={({ value, onChange, invalid }) => (
              <input
                type="checkbox"
                aria-label="I accept"
                aria-invalid={invalid || undefined}
                checked={value}
                onChange={(event) => onChange(event.target.checked)}
              />
            )}
          />
          <Button type="submit">Continue</Button>
        </Form>
      );
    }
    const user = setupUser();
    const { container } = renderUi(<Terms />);
    await user.click(submit(container));
    await vi.waitFor(() => expect(container.textContent).toContain("Accept the terms to continue"));
    expect(container.querySelector("input[type=checkbox]")?.getAttribute("aria-invalid")).toBe(
      "true",
    );
  });
});

describe("Form with zodResolver, async validation and FormErrorSummary", () => {
  // The async refinement plus several typed fields can pass 1 s on a loaded CI runner.
  const ASYNC = { timeout: 5000 };
  const taken = new Set(["northline"]);
  const schema = z.object({
    business: z.string().min(2, "Enter your business name"),
    slug: z
      .string()
      .min(3, "Use at least 3 characters")
      .refine(
        async (slug) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return !taken.has(slug);
        },
        { message: "That address is taken" },
      ),
    seats: z.number("Enter the number of seats").int().min(1, "At least 1 seat"),
  });
  type Input = z.input<typeof schema>;
  type Output = z.output<typeof schema>;

  function Signup({ onSave }: { onSave: (values: Output) => void }) {
    const form = useForm<Input, unknown, Output>({
      resolver: zodResolver(schema),
      defaultValues: { business: "", slug: "" },
      shouldFocusError: false,
    });
    const [submitted, setSubmitted] = useState(false);
    return (
      <Form
        form={form}
        onSubmit={(values) => {
          setSubmitted(true);
          onSave(values);
        }}
      >
        <FormErrorSummary />
        <FormField name="business" label="Business name" required>
          <Input />
        </FormField>
        <FormField name="slug" label="Web address" required>
          <Input />
        </FormField>
        <FormField name="seats" label="Seats" required rules={{ setValueAs: numberOrNull }}>
          <Input inputMode="numeric" />
        </FormField>
        <Button type="submit">Create</Button>
        <p role="status">{submitted ? "Created" : ""}</p>
      </Form>
    );
  }

  it("lists schema errors in the summary, takes focus, then runs the async check", async () => {
    const onSave = vi.fn();
    const user = setupUser();
    const { container } = renderUi(<Signup onSave={onSave} />);
    await user.click(submit(container));
    const summary = () => container.querySelector('[role="alert"]') as HTMLElement | null;
    await vi.waitFor(() => expect(summary()).not.toBeNull(), ASYNC);
    expect(document.activeElement).toBe(summary());
    expect(Array.from(summary()?.querySelectorAll("a") ?? []).map((a) => a.textContent)).toEqual([
      "Enter your business name",
      "Use at least 3 characters",
      "Enter the number of seats",
    ]);

    await user.type(inputByLabel(container, "Business name"), "Northline Electrical");
    await user.type(inputByLabel(container, "Web address"), "northline");
    await user.type(inputByLabel(container, "Seats"), "4");
    await user.click(submit(container));
    await vi.waitFor(() => expect(container.textContent).toContain("That address is taken"), ASYNC);
    expect(onSave).not.toHaveBeenCalled();
    // The summary shows the new errors, not the ones from the first submit.
    expect(Array.from(summary()?.querySelectorAll("a") ?? []).map((a) => a.textContent)).toEqual([
      "That address is taken",
    ]);

    await user.clear(inputByLabel(container, "Web address"));
    await user.type(inputByLabel(container, "Web address"), "northline-nz");
    await user.click(submit(container));
    await vi.waitFor(() => expect(onSave).toHaveBeenCalled(), ASYNC);
    expect(onSave.mock.calls[0]?.[0]).toEqual({
      business: "Northline Electrical",
      slug: "northline-nz",
      seats: 4,
    });
    expect(summary()).toBeNull();
  });

  it("passes axe after a failed submit", async () => {
    const user = setupUser();
    const { container } = renderUi(<Signup onSave={vi.fn()} />);
    await user.click(submit(container));
    await vi.waitFor(() => expect(container.querySelector('[role="alert"]')).not.toBeNull());
    await expectNoA11yViolations(container);
  });
});
