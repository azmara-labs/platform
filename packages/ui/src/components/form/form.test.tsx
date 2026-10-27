import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { act, createRef, type FormEvent, useState } from "react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { Button } from "../button/button.js";
import { Field } from "../field/field.js";
import { Input } from "../input/input.js";
import {
  ErrorSummary,
  Fieldset,
  FieldsetLegend,
  FieldsetRoot,
  FormSection,
  toErrorSummaryItems,
} from "./index.js";

const byId = (id: string | null) => (id ? document.getElementById(id) : null);
const describedBy = (el: Element) =>
  (el.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .filter(Boolean)
    .map((id) => byId(id)?.textContent);
const summary = (container: HTMLElement) =>
  container.querySelector('[role="alert"]') as HTMLElement | null;
const link = (container: HTMLElement, text: string) =>
  Array.from(container.querySelectorAll("a")).find((a) => a.textContent === text) as
    | HTMLAnchorElement
    | undefined;

describe("Fieldset", () => {
  it("renders a fieldset named by its legend", () => {
    const { container } = renderUi(
      <Fieldset legend="Delivery address">
        <Field label="Street">
          <Input />
        </Field>
      </Fieldset>,
    );
    const fieldset = container.querySelector("fieldset") as HTMLFieldSetElement;
    expect(byId(fieldset.getAttribute("aria-labelledby"))?.textContent).toBe("Delivery address");
    expect(fieldset.hasAttribute("aria-describedby")).toBe(false);
  });

  it("describes the group with its description, then its error, keeping an aria-describedby given", () => {
    const { container } = renderUi(
      <>
        <p id="extra">Extra</p>
        <Fieldset
          legend="Delivery"
          description="Choose one."
          error="Choose a delivery option"
          aria-describedby="extra"
        >
          <Input />
        </Fieldset>
      </>,
    );
    const fieldset = container.querySelector("fieldset") as HTMLFieldSetElement;
    expect(describedBy(fieldset)).toEqual(["Extra", "Choose one.", "Choose a delivery option"]);
    expect(fieldset.hasAttribute("data-invalid")).toBe(true);
  });

  it("announces a group error in a live region that exists before the error does", () => {
    const { container, rerender } = renderUi(
      <Fieldset legend="Delivery">
        <Input />
      </Fieldset>,
    );
    const region = container.querySelector("[aria-live]") as HTMLElement;
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.textContent).toBe("");
    for (const error of [null, false, ""]) {
      rerender(
        <Fieldset legend="Delivery" error={error}>
          <Input />
        </Fieldset>,
      );
      expect(region.textContent).toBe("");
    }
    rerender(
      <Fieldset legend="Delivery" error="Choose a delivery option">
        <Input />
      </Fieldset>,
    );
    expect(container.querySelector("[aria-live]")).toBe(region);
    expect(region.textContent).toBe("Choose a delivery option");
  });

  it("disables every control inside when disabled", () => {
    const { container } = renderUi(
      <Fieldset legend="Billing" disabled>
        <Field label="Card name">
          <Input />
        </Field>
      </Fieldset>,
    );
    expect((container.querySelector("fieldset") as HTMLFieldSetElement).disabled).toBe(true);
    expect((container.querySelector("input") as HTMLInputElement).matches(":disabled")).toBe(true);
  });

  it("forwards the ref and merges className; the parts compose", () => {
    const ref = createRef<HTMLElement>();
    const { container } = renderUi(
      <>
        <Fieldset ref={ref} legend="One" className="max-w-md">
          <Input />
        </Fieldset>
        <FieldsetRoot className="gap-2">
          <FieldsetLegend className="text-sm">Two</FieldsetLegend>
          <Input />
        </FieldsetRoot>
      </>,
    );
    const [first, second] = Array.from(container.querySelectorAll("fieldset"));
    expect(ref.current).toBe(first);
    expect(first?.className).toContain("max-w-md");
    expect(second?.className).toContain("gap-2");
    expect(byId(second?.getAttribute("aria-labelledby") ?? null)?.textContent).toBe("Two");
  });
});

describe("FormSection", () => {
  it("is a region named by its heading, at the level asked for", () => {
    const { container } = renderUi(
      <>
        <FormSection title="Profile" description="Shown on invoices.">
          <Input />
        </FormSection>
        <FormSection title="Danger zone" headingLevel={3}>
          <Input />
        </FormSection>
      </>,
    );
    const [profile, danger] = Array.from(container.querySelectorAll("section"));
    expect(byId(profile?.getAttribute("aria-labelledby") ?? null)?.tagName).toBe("H2");
    expect(byId(profile?.getAttribute("aria-labelledby") ?? null)?.textContent).toBe("Profile");
    expect(profile?.textContent).toContain("Shown on invoices.");
    expect(byId(danger?.getAttribute("aria-labelledby") ?? null)?.tagName).toBe("H3");
  });

  it("lays fields out in two columns and beside the heading by container width", () => {
    const { container } = renderUi(
      <FormSection title="Profile" columns={2} layout="aside" className="mt-8">
        <Input />
      </FormSection>,
    );
    const section = container.querySelector("section") as HTMLElement;
    expect(section.className).toContain("@container");
    expect(section.className).toContain("mt-8");
    expect(section.innerHTML).toContain("@3xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]");
    expect(section.innerHTML).toContain("@lg:grid-cols-2");
  });

  it("stays in one column by default", () => {
    const { container } = renderUi(
      <FormSection title="Profile">
        <Input />
      </FormSection>,
    );
    expect(container.innerHTML).not.toContain("grid-cols-2");
    expect(container.innerHTML).not.toContain("@3xl:");
  });
});

describe("toErrorSummaryItems", () => {
  it("reads a list, a plain record and Base UI Form's message lists", () => {
    expect(
      toErrorSummaryItems([
        { name: "a", message: "A" },
        { name: "b", message: "" },
      ]),
    ).toEqual([{ name: "a", message: "A" }]);
    expect(
      toErrorSummaryItems({ email: "Enter an email", phone: ["Too short", "Digits only"] }),
    ).toEqual([
      { name: "email", message: "Enter an email" },
      { name: "phone", message: "Too short" },
    ]);
    expect(toErrorSummaryItems(undefined)).toEqual([]);
    expect(toErrorSummaryItems({})).toEqual([]);
  });

  it("flattens React Hook Form errors: nested groups, field arrays and root errors", () => {
    const ref = document.createElement("input");
    const errors = {
      email: { type: "required", message: "Enter an email", ref },
      address: { city: { type: "required", message: "Enter a city", ref } },
      lines: Object.assign(
        [undefined, { amount: { type: "min", message: "Enter an amount above 0", ref } }],
        { root: { type: "min", message: "Add at least two lines" } },
      ),
      // Groups can have fields called "type" and "message".
      contact: {
        type: { type: "required", message: "Choose a contact type" },
        message: { type: "required", message: "Write a message" },
      },
      nameless: { type: "required", message: "", ref },
      root: { serverError: { type: "500", message: "Could not save" } },
    };
    expect(toErrorSummaryItems(errors)).toEqual([
      { name: "email", message: "Enter an email" },
      { name: "address.city", message: "Enter a city" },
      { name: "lines.1.amount", message: "Enter an amount above 0" },
      { name: "lines", message: "Add at least two lines" },
      { name: "contact.type", message: "Choose a contact type" },
      { name: "contact.message", message: "Write a message" },
      { name: "root.serverError", message: "Could not save" },
    ]);
  });
});

describe("ErrorSummary: rendering", () => {
  it("renders nothing while there are no errors", () => {
    for (const errors of [undefined, null, {}, [], { email: undefined }]) {
      const { container, unmount } = renderUi(<ErrorSummary errors={errors} />);
      expect(container.innerHTML).toBe("");
      unmount();
    }
  });

  it("lists each error as a link to its field, under a heading that names the summary", () => {
    const { container } = renderUi(
      <ErrorSummary
        errors={{ email: "Enter an email", root: "Could not save" }}
        description="Fix these to continue."
      />,
    );
    const box = summary(container) as HTMLElement;
    expect(byId(box.getAttribute("aria-labelledby"))?.textContent).toBe("There is a problem");
    expect(box.tabIndex).toBe(-1);
    expect(box.textContent).toContain("Fix these to continue.");
    expect(link(container, "Enter an email")?.getAttribute("href")).toBe("#email");
    // Form-level errors have no field to go to.
    expect(link(container, "Could not save")).toBeUndefined();
    expect(box.querySelectorAll("li")).toHaveLength(2);
  });

  it("links to targetId when given, and takes a custom title", () => {
    const { container } = renderUi(
      <ErrorSummary
        title="Check your answers"
        errors={[{ name: "x", targetId: "dob-day", message: "Enter a date" }]}
      />,
    );
    expect(container.querySelector("h2")?.textContent).toBe("Check your answers");
    expect(link(container, "Enter a date")?.getAttribute("href")).toBe("#dob-day");
  });
});

describe("ErrorSummary: focus", () => {
  it("takes focus when errors first arrive, but not when they change while someone types", () => {
    const { container, rerender } = renderUi(
      <>
        <input aria-label="Other" />
        <ErrorSummary errors={{}} />
      </>,
    );
    expect(summary(container)).toBeNull();

    rerender(
      <>
        <input aria-label="Other" />
        <ErrorSummary errors={{ email: "Enter an email", name: "Enter a name" }} />
      </>,
    );
    expect(document.activeElement).toBe(summary(container));

    const other = container.querySelector("input") as HTMLInputElement;
    act(() => other.focus());
    rerender(
      <>
        <input aria-label="Other" />
        <ErrorSummary errors={{ email: "Enter an email" }} />
      </>,
    );
    expect(document.activeElement).toBe(other);
  });

  it("takes focus again on every failed submit when given submitCount", () => {
    const errors = { email: "Enter an email" };
    const { container, rerender } = renderUi(<ErrorSummary errors={errors} submitCount={1} />);
    expect(document.activeElement).toBe(summary(container));

    act(() => (summary(container) as HTMLElement).blur());
    rerender(<ErrorSummary errors={{ ...errors }} submitCount={1} />);
    expect(document.activeElement).toBe(document.body);

    rerender(<ErrorSummary errors={{ ...errors }} submitCount={2} />);
    expect(document.activeElement).toBe(summary(container));
  });

  it("does not take focus back when errors reappear between submits, as when revalidating on change", () => {
    const { container, rerender } = renderUi(
      <>
        <input aria-label="Other" />
        <ErrorSummary errors={{ email: "Enter an email" }} submitCount={1} />
      </>,
    );
    expect(document.activeElement).toBe(summary(container));
    rerender(
      <>
        <input aria-label="Other" />
        <ErrorSummary errors={{}} submitCount={1} />
      </>,
    );
    const other = container.querySelector("input") as HTMLInputElement;
    act(() => other.focus());
    rerender(
      <>
        <input aria-label="Other" />
        <ErrorSummary errors={{ email: "Enter a valid email" }} submitCount={1} />
      </>,
    );
    expect(summary(container)).not.toBeNull();
    expect(document.activeElement).toBe(other);
  });

  it("does not take focus when a submit succeeds", () => {
    const { container, rerender } = renderUi(<ErrorSummary errors={{}} submitCount={0} />);
    rerender(<ErrorSummary errors={{}} submitCount={1} />);
    expect(summary(container)).toBeNull();
    expect(document.activeElement).toBe(document.body);
  });
});

describe("ErrorSummary: links", () => {
  it("focuses the field by name and scrolls its label into view", async () => {
    const user = setupUser();
    const scrolled = vi.fn();
    const { container } = renderUi(
      <form noValidate>
        <ErrorSummary errors={{ email: "Enter an email" }} />
        <Field label="Email">
          <Input name="email" />
        </Field>
      </form>,
    );
    const label = container.querySelector("label") as HTMLLabelElement;
    label.scrollIntoView = scrolled;
    await user.click(link(container, "Enter an email") as HTMLAnchorElement);
    expect(document.activeElement).toBe(container.querySelector('input[name="email"]'));
    expect(scrolled).toHaveBeenCalledWith({ block: "center" });

    // The page doesn't jump to the href as well: focus and scrolling are handled above.
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    act(() => {
      (link(container, "Enter an email") as HTMLAnchorElement).dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
  });

  it("focuses a control by targetId, and escapes quotes in names", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <form>
        <ErrorSummary
          errors={[
            { name: "dob", targetId: "dob-day", message: "Enter a date" },
            { name: 'odd"name', message: "Odd" },
          ]}
        />
        <input id="dob-day" aria-label="Day" />
        <input name={'odd"name'} aria-label="Odd" />
      </form>,
    );
    await user.click(link(container, "Enter a date") as HTMLAnchorElement);
    expect(document.activeElement?.id).toBe("dob-day");
    await user.click(link(container, "Odd") as HTMLAnchorElement);
    expect(document.activeElement?.getAttribute("name")).toBe('odd"name');
  });

  it("skips hidden inputs and focuses the visible radio, scrolling the group's legend into view", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <form>
        <ErrorSummary errors={{ delivery: "Choose a delivery option" }} />
        <Fieldset legend="Delivery">
          <RadioGroup name="delivery" aria-label="Delivery">
            <Radio.Root value="courier" aria-label="Courier" />
            <Radio.Root value="pickup" aria-label="Pick up" />
          </RadioGroup>
        </Fieldset>
      </form>,
    );
    const legend = byId(
      (container.querySelector("fieldset") as HTMLElement).getAttribute("aria-labelledby"),
    ) as HTMLElement;
    legend.scrollIntoView = vi.fn();
    await user.click(link(container, "Choose a delivery option") as HTMLAnchorElement);
    const active = document.activeElement as HTMLElement;
    expect(active.getAttribute("role")).toBe("radio");
    expect(legend.scrollIntoView).toHaveBeenCalled();
  });

  it("leaves the link to its href when no field matches", () => {
    const { container } = renderUi(<ErrorSummary errors={{ missing: "Gone" }} />);
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    act(() => {
      (link(container, "Gone") as HTMLAnchorElement).dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(false);
  });
});

describe("ErrorSummary: with react-hook-form", () => {
  type Values = { name: string; email: string };

  function ProfileForm({ onSave }: { onSave: (values: Values) => void }) {
    const {
      register,
      handleSubmit,
      formState: { errors, submitCount },
    } = useForm<Values>({ defaultValues: { name: "", email: "" }, shouldFocusError: false });
    return (
      <form noValidate onSubmit={handleSubmit(onSave)}>
        <ErrorSummary errors={errors} submitCount={submitCount} />
        <Field label="Name" error={errors.name?.message}>
          <Input {...register("name", { required: "Enter your name" })} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" {...register("email", { required: "Enter your email address" })} />
        </Field>
        <Button type="submit">Save</Button>
      </form>
    );
  }

  it("focuses the summary on a failed submit, its links focus the fields, then it submits", async () => {
    const onSave = vi.fn();
    const user = setupUser();
    const { container } = renderUi(<ProfileForm onSave={onSave} />);
    const submit = container.querySelector("button[type=submit]") as HTMLButtonElement;

    await user.click(submit);
    await vi.waitFor(() => expect(document.activeElement).toBe(summary(container)));
    expect(
      Array.from((summary(container) as HTMLElement).querySelectorAll("a")).map(
        (a) => a.textContent,
      ),
    ).toEqual(["Enter your name", "Enter your email address"]);

    await user.click(link(container, "Enter your email address") as HTMLAnchorElement);
    expect(document.activeElement).toBe(container.querySelector('input[name="email"]'));
    await user.type(document.activeElement as HTMLInputElement, "kia@ora.nz");

    // A second failed submit brings focus back to the summary.
    await user.click(submit);
    await vi.waitFor(() => expect(document.activeElement).toBe(summary(container)));
    expect(link(container, "Enter your email address")).toBeUndefined();

    await user.click(link(container, "Enter your name") as HTMLAnchorElement);
    await user.type(document.activeElement as HTMLInputElement, "Aroha");
    await user.click(submit);
    await vi.waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0]?.[0]).toEqual({ name: "Aroha", email: "kia@ora.nz" });
    expect(summary(container)).toBeNull();
  });
});

describe("Form layout: accessibility", () => {
  function SettingsForm() {
    const [errors, setErrors] = useState<Record<string, string>>({});
    function onSubmit(event: FormEvent) {
      event.preventDefault();
      setErrors({ name: "Enter your name", delivery: "Choose a delivery option" });
    }
    return (
      <form noValidate onSubmit={onSubmit}>
        <ErrorSummary errors={errors} />
        <FormSection title="Profile" columns={2} layout="aside" description="Shown on invoices.">
          <Field label="Name" required error={errors.name}>
            <Input name="name" />
          </Field>
          <Fieldset legend="Delivery" description="How we send orders." error={errors.delivery}>
            <Field label="Courier account">
              <Input name="courier" />
            </Field>
          </Fieldset>
        </FormSection>
        <Button type="submit">Save</Button>
      </form>
    );
  }

  it("passes axe before and after a failed submit", async () => {
    const user = setupUser();
    const { container } = renderUi(<SettingsForm />);
    await expectNoA11yViolations(container);
    await user.click(container.querySelector("button[type=submit]") as HTMLButtonElement);
    expect(document.activeElement).toBe(summary(container));
    await expectNoA11yViolations(container);
  });
});
