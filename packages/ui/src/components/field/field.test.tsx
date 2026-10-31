import { createRef } from "react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { Button } from "../button/button.js";
import { Input } from "../input/input.js";
import { Textarea } from "../input/textarea.js";
import { Field, FieldDescription, FieldError, FieldLabel, FieldRoot } from "./field.js";

const input = (container: HTMLElement) => container.querySelector("input") as HTMLInputElement;
const byId = (id: string | null) => (id ? document.getElementById(id) : null);
const describedBy = (el: HTMLElement) =>
  (el.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter(Boolean)
    .map((id) => byId(id)?.textContent);

describe("Field: label and description", () => {
  it("associates the label with the control", () => {
    const { container } = renderUi(
      <Field label="Email">
        <Input />
      </Field>,
    );
    const label = container.querySelector("label") as HTMLLabelElement;
    expect(label.htmlFor).toBe(input(container).id);
    expect(byId(input(container).getAttribute("aria-labelledby"))).toBe(label);
  });

  it("describes the control with the description", () => {
    const { container } = renderUi(
      <Field label="Email" description="We only use it for receipts.">
        <Input />
      </Field>,
    );
    expect(describedBy(input(container))).toEqual(["We only use it for receipts."]);
  });

  it("keeps an id the control was given", () => {
    const { container } = renderUi(
      <Field label="Email">
        <Input id="email" />
      </Field>,
    );
    expect(input(container).id).toBe("email");
    expect((container.querySelector("label") as HTMLLabelElement).htmlFor).toBe("email");
  });
});

describe("Field: errors", () => {
  it("is valid with no error, and treats an empty string, null and false as no error", () => {
    for (const error of [undefined, null, false, ""]) {
      const { container, unmount } = renderUi(
        <Field label="Email" error={error}>
          <Input />
        </Field>,
      );
      expect(input(container).hasAttribute("aria-invalid")).toBe(false);
      expect(input(container).hasAttribute("aria-errormessage")).toBe(false);
      expect(container.querySelector("[aria-live] > *")).toBeNull();
      unmount();
    }
  });

  it("marks the control invalid and points aria-errormessage and aria-describedby at the error", () => {
    const { container } = renderUi(
      <Field label="Email" description="Work address" error="Enter an email address">
        <Input />
      </Field>,
    );
    const control = input(container);
    expect(control.getAttribute("aria-invalid")).toBe("true");
    expect(byId(control.getAttribute("aria-errormessage"))?.textContent).toBe(
      "Enter an email address",
    );
    expect(describedBy(control)).toEqual(["Work address", "Enter an email address"]);
  });

  it("renders the error inside a live region that exists before the error does", () => {
    const { container, rerender } = renderUi(
      <Field label="Email">
        <Input />
      </Field>,
    );
    const region = container.querySelector("[aria-live]") as HTMLElement;
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.textContent).toBe("");

    rerender(
      <Field label="Email" error="Enter an email address">
        <Input />
      </Field>,
    );
    expect(container.querySelector("[aria-live]")).toBe(region);
    expect(region.textContent).toBe("Enter an email address");
  });

  it("accepts an invalid flag without a message", () => {
    const { container } = renderUi(
      <Field label="Email" invalid>
        <Input />
      </Field>,
    );
    expect(input(container).getAttribute("aria-invalid")).toBe("true");
  });

  it("shows the field's own validation message when no error prop is given", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <Field
        label="Code"
        validationMode="onBlur"
        validate={(value) => (String(value).length < 4 ? "Use at least 4 characters" : null)}
      >
        <Input />
      </Field>,
    );
    await user.type(input(container), "ab");
    await user.tab();
    await vi.waitFor(() =>
      expect(container.querySelector("[aria-live]")?.textContent).toBe("Use at least 4 characters"),
    );
    expect(input(container).getAttribute("aria-invalid")).toBe("true");
  });
});

describe("Field: required", () => {
  it("shows a marker hidden from screen readers and sets aria-required on the control", () => {
    const { container } = renderUi(
      <Field label="Email" required>
        <Input />
      </Field>,
    );
    const marker = container.querySelector("label [aria-hidden=true]") as HTMLElement;
    expect(marker.textContent).toBe("*");
    expect(input(container).getAttribute("aria-required")).toBe("true");
    expect(input(container).required).toBe(false);
  });

  it("leaves the control alone when not required", () => {
    const { container } = renderUi(
      <Field label="Email">
        <Input />
      </Field>,
    );
    expect(container.querySelector("label [aria-hidden]")).toBeNull();
    expect(input(container).hasAttribute("aria-required")).toBe(false);
  });
});

describe("Field: children", () => {
  it("still renders more than one child, without cloning them", () => {
    const { container } = renderUi(
      <Field label="Amount" required>
        <span>NZ$</span>
        <Input />
      </Field>,
    );
    expect(container.textContent).toContain("NZ$");
    expect(input(container).hasAttribute("aria-required")).toBe(false);
  });

  it("forwards the ref to the root and the control's ref to the control", () => {
    const root = createRef<HTMLDivElement>();
    const control = createRef<HTMLInputElement>();
    const { container } = renderUi(
      <Field ref={root} label="Email" className="max-w-sm">
        <Input ref={control} />
      </Field>,
    );
    expect(root.current).toBe(container.firstElementChild);
    expect(root.current?.className).toContain("max-w-sm");
    expect(control.current).toBe(input(container));
  });
});

describe("Field: parts", () => {
  it("compose into a custom layout with the same wiring", () => {
    const { container } = renderUi(
      <FieldRoot invalid>
        <div className="flex justify-between">
          <FieldLabel required>Password</FieldLabel>
          <a href="#forgot">Forgot?</a>
        </div>
        <Input type="password" />
        <FieldDescription>At least 12 characters.</FieldDescription>
        <FieldError match>Too short</FieldError>
      </FieldRoot>,
    );
    const control = input(container);
    expect(byId(control.getAttribute("aria-labelledby"))?.textContent).toBe("Password*");
    expect(describedBy(control)).toEqual(["At least 12 characters.", "Too short"]);
    expect(control.getAttribute("aria-invalid")).toBe("true");
  });
});

describe("Field: Textarea", () => {
  it("labels and describes a Textarea", () => {
    const ref = createRef<HTMLTextAreaElement>();
    const { container } = renderUi(
      <Field label="Notes" description="Shown on the invoice." error="Too long">
        <Textarea ref={ref} />
      </Field>,
    );
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(ref.current).toBe(textarea);
    expect((container.querySelector("label") as HTMLLabelElement).htmlFor).toBe(textarea.id);
    expect(describedBy(textarea)).toEqual(["Shown on the invoice.", "Too long"]);
    expect(textarea.getAttribute("aria-invalid")).toBe("true");
  });
});

describe("Field: react-hook-form", () => {
  type Values = { email: string; notes: string };

  function Form({ onSubmit }: { onSubmit: (values: Values) => void }) {
    const {
      register,
      handleSubmit,
      formState: { errors },
    } = useForm<Values>({ defaultValues: { email: "", notes: "" } });
    return (
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <Field label="Email" required error={errors.email?.message}>
          <Input type="email" {...register("email", { required: "Enter your email address" })} />
        </Field>
        <Field label="Notes">
          <Textarea {...register("notes")} />
        </Field>
        <Button type="submit">Save</Button>
      </form>
    );
  }

  it("shows the register() error, then submits once it is fixed, with no Controller", async () => {
    const onSubmit = vi.fn();
    const user = setupUser();
    const { container } = renderUi(<Form onSubmit={onSubmit} />);
    const submit = container.querySelector("button[type=submit]") as HTMLButtonElement;

    await user.click(submit);
    await vi.waitFor(() =>
      expect(container.querySelector("[aria-live]")?.textContent).toBe("Enter your email address"),
    );
    expect(onSubmit).not.toHaveBeenCalled();
    expect(input(container).getAttribute("aria-invalid")).toBe("true");

    await user.type(input(container), "kia@ora.nz");
    await user.type(container.querySelector("textarea") as HTMLTextAreaElement, "Paid");
    await user.click(submit);
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ email: "kia@ora.nz", notes: "Paid" });
    expect(input(container).hasAttribute("aria-invalid")).toBe(false);
  });
});

describe("Field: accessibility", () => {
  it("passes axe when valid, invalid and required", async () => {
    const { container } = renderUi(
      <form>
        <Field label="Name" description="As on your IRD number.">
          <Input />
        </Field>
        <Field label="Email" required error="Enter an email address">
          <Input type="email" />
        </Field>
        <Field label="Notes">
          <Textarea />
        </Field>
      </form>,
    );
    await expectNoA11yViolations(container);
  });
});

describe("Field: any control (function child)", () => {
  // What a Radix Select trigger renders: a button Base UI's Field doesn't know about.
  const trigger = (container: HTMLElement) =>
    container.querySelector('[role="combobox"]') as HTMLButtonElement;

  it("labels the control with the label", () => {
    const { container } = renderUi(
      <Field label="Customer">
        {(control) => (
          <button type="button" role="combobox" aria-expanded="false" {...control}>
            Pick one
          </button>
        )}
      </Field>,
    );
    const label = container.querySelector("label") as HTMLLabelElement;
    expect(label.htmlFor).toBe(trigger(container).id);
    expect(byId(trigger(container).getAttribute("aria-labelledby"))).toBe(label);
  });

  it("describes the control with the description and the error, and marks it invalid", () => {
    const { container } = renderUi(
      <Field
        label="Customer"
        description="Who the invoice is for."
        error="Select a customer"
        required
      >
        {(control) => (
          <button type="button" role="combobox" aria-expanded="false" {...control}>
            Pick one
          </button>
        )}
      </Field>,
    );
    const control = trigger(container);
    expect(describedBy(control)).toEqual(["Who the invoice is for.", "Select a customer"]);
    expect(control.getAttribute("aria-invalid")).toBe("true");
    expect(control.getAttribute("aria-required")).toBe("true");
    expect(byId(control.getAttribute("aria-errormessage"))?.textContent).toBe("Select a customer");
  });

  it("adds no ARIA it has nothing for", () => {
    const { container } = renderUi(<Field>{(control) => <select {...control} />}</Field>);
    const select = container.querySelector("select") as HTMLSelectElement;
    expect(select.id).not.toBe("");
    for (const name of [
      "aria-labelledby",
      "aria-describedby",
      "aria-invalid",
      "aria-required",
      "aria-errormessage",
    ]) {
      expect(select.hasAttribute(name)).toBe(false);
    }
  });

  it("marks the control invalid from `invalid` without an error message", () => {
    const { container } = renderUi(
      <Field label="Country" invalid>
        {(control) => <select {...control} />}
      </Field>,
    );
    expect(
      (container.querySelector("select") as HTMLSelectElement).getAttribute("aria-invalid"),
    ).toBe("true");
  });

  it("focuses a native control when the label is clicked", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <Field label="Country">
        {(control) => (
          <select {...control}>
            <option>New Zealand</option>
          </select>
        )}
      </Field>,
    );
    await user.click(container.querySelector("label") as HTMLLabelElement);
    expect(document.activeElement).toBe(container.querySelector("select"));
  });

  it("has no accessibility violations with an error showing", async () => {
    const { container } = renderUi(
      <Field label="Customer" description="Who the invoice is for." error="Select a customer">
        {(control) => (
          <button type="button" role="combobox" aria-expanded="false" {...control}>
            Pick one
          </button>
        )}
      </Field>,
    );
    await expectNoA11yViolations(container);
  });
});
