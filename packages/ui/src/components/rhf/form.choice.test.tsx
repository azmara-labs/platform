import { within } from "@testing-library/dom";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { renderUi, setupUser } from "../../test-utils/index.js";
import { Button } from "../button/button.js";
import { Checkbox } from "../choice/checkbox.js";
import { CheckboxGroup } from "../choice/checkbox-group.js";
import { RadioGroup } from "../choice/radio-group.js";
import { Switch } from "../choice/switch.js";
import { zodResolver } from "../zod/resolver.js";
import { Form, FormField } from "./index.js";

const PLANS = [
  { value: "free", label: "Free" },
  { value: "pro", label: "Pro" },
];
const TAGS = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
];
const submit = (container: HTMLElement) =>
  container.querySelector("button[type=submit]") as HTMLButtonElement;

describe("FormField with the choice controls", () => {
  type Values = { terms: boolean; notify: boolean; plan: string; tags: string[] };

  function Everything({ onSave }: { onSave: (values: Values) => void }) {
    const form = useForm<Values>({
      defaultValues: { terms: false, notify: false, plan: "", tags: [] },
    });
    return (
      <Form form={form} onSubmit={onSave}>
        <FormField<Values> name="terms">
          <Checkbox label="Accept the terms" />
        </FormField>
        <FormField<Values> name="notify">
          <Switch label="Email me" />
        </FormField>
        <FormField<Values> name="plan">
          <RadioGroup label="Plan" options={PLANS} />
        </FormField>
        <FormField<Values> name="tags">
          <CheckboxGroup label="Tags" options={TAGS} />
        </FormField>
        <Button type="submit">Save</Button>
      </Form>
    );
  }

  it("submits real booleans, a string and a string array, never 'on' or 'false'", async () => {
    const user = setupUser();
    const onSave = vi.fn();
    const { container } = renderUi(<Everything onSave={onSave} />);
    await user.click(within(container).getByText("Accept the terms"));
    await user.click(within(container).getByText("Email me"));
    await user.click(within(container).getByText("Pro"));
    await user.click(within(container).getByText("Alpha"));
    await user.click(within(container).getByText("Gamma"));
    await user.click(submit(container));
    await vi.waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0]?.[0]).toEqual({
      terms: true,
      notify: true,
      plan: "pro",
      tags: ["a", "c"],
    });
  });

  it("an untouched form submits false, false, an empty string and an empty array", async () => {
    const user = setupUser();
    const onSave = vi.fn();
    const { container } = renderUi(<Everything onSave={onSave} />);
    await user.click(submit(container));
    await vi.waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0]?.[0]).toEqual({
      terms: false,
      notify: false,
      plan: "",
      tags: [],
    });
  });

  it("ticking then unticking submits false", async () => {
    const user = setupUser();
    const onSave = vi.fn();
    const { container } = renderUi(<Everything onSave={onSave} />);
    await user.click(within(container).getByText("Accept the terms"));
    await user.click(within(container).getByText("Accept the terms"));
    await user.click(submit(container));
    await vi.waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0]?.[0]).toMatchObject({ terms: false });
  });

  it("a field with no default renders unchecked and empty, with no controlled/uncontrolled warning", async () => {
    const user = setupUser();
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const onSave = vi.fn();
    function NoDefaults() {
      const form = useForm<Partial<Values>>();
      return (
        <Form form={form} onSubmit={onSave}>
          <FormField<Partial<Values>> name="terms">
            <Checkbox label="Accept the terms" />
          </FormField>
          <FormField<Partial<Values>> name="notify">
            <Switch label="Email me" />
          </FormField>
          <FormField<Partial<Values>> name="plan">
            <RadioGroup label="Plan" options={PLANS} />
          </FormField>
          <FormField<Partial<Values>> name="tags">
            <CheckboxGroup label="Tags" options={TAGS} />
          </FormField>
          <Button type="submit">Save</Button>
        </Form>
      );
    }
    const { container } = renderUi(<NoDefaults />);
    const states = [
      ...within(container).getAllByRole("checkbox"),
      ...within(container).getAllByRole("switch"),
      ...within(container).getAllByRole("radio"),
    ].map((el) => el.getAttribute("aria-checked"));
    expect(new Set(states)).toEqual(new Set(["false"]));
    await user.click(within(container).getByText("Accept the terms"));
    expect(
      within(container)
        .getByRole("checkbox", { name: "Accept the terms" })
        .getAttribute("aria-checked"),
    ).toBe("true");
    const warnings = error.mock.calls.map((call) => String(call[0]));
    error.mockRestore();
    expect(warnings.filter((w) => /controlled|uncontrolled/i.test(w))).toEqual([]);
  });

  it("shows the resolver's errors on the choice controls and marks them invalid", async () => {
    const user = setupUser();
    const schema = z.object({
      terms: z.literal(true, "You must accept the terms"),
      plan: z.enum(["free", "pro"], "Pick a plan"),
      tags: z.array(z.enum(["a", "b", "c"])).min(1, "Pick at least one tag"),
    });
    type In = { terms: boolean; plan: string; tags: string[] };
    function Checked() {
      const form = useForm<In>({
        defaultValues: { terms: false, plan: "", tags: [] },
        resolver: zodResolver(schema) as never,
      });
      return (
        <Form form={form} onSubmit={() => undefined}>
          <FormField<In> name="terms">
            <Checkbox label="Accept the terms" />
          </FormField>
          <FormField<In> name="plan">
            <RadioGroup label="Plan" options={PLANS} />
          </FormField>
          <FormField<In> name="tags">
            <CheckboxGroup label="Tags" options={TAGS} />
          </FormField>
          <Button type="submit">Save</Button>
        </Form>
      );
    }
    const { container } = renderUi(<Checked />);
    await user.click(submit(container));
    await vi.waitFor(() => expect(container.textContent).toContain("You must accept the terms"));
    expect(container.textContent).toContain("Pick a plan");
    expect(container.textContent).toContain("Pick at least one tag");
    expect(
      within(container)
        .getByRole("checkbox", { name: "Accept the terms" })
        .getAttribute("aria-invalid"),
    ).toBe("true");
    expect(within(container).getByRole("radiogroup").getAttribute("aria-invalid")).toBe("true");
  });

  it("reads only the boolean true as ticked: the string 'false' is not", () => {
    function Stringly() {
      const form = useForm<{ terms: boolean }>({
        defaultValues: { terms: "false" as unknown as boolean },
      });
      return (
        <Form form={form} onSubmit={() => undefined}>
          <FormField<{ terms: boolean }> name="terms">
            <Checkbox label="Accept the terms" />
          </FormField>
        </Form>
      );
    }
    const { container } = renderUi(<Stringly />);
    const box = within(container).getByRole("checkbox", { name: "Accept the terms" });
    expect(box.getAttribute("aria-checked")).toBe("false");
  });

  it.each(["onBlur", "onTouched"] as const)(
    "with mode %s a group is validated when focus leaves it, not on submit",
    async (mode) => {
      const user = setupUser();
      const schema = z.object({ plan: z.enum(["free", "pro"], "Pick a plan") });
      type In = { plan: string };
      function Blurry() {
        const form = useForm<In>({ mode, resolver: zodResolver(schema) as never });
        return (
          <Form form={form} onSubmit={() => undefined}>
            <FormField<In> name="plan">
              <RadioGroup label="Plan" options={PLANS} />
            </FormField>
            <button type="button">After</button>
          </Form>
        );
      }
      const { container } = renderUi(<Blurry />);
      await user.tab();
      expect(container.textContent).not.toContain("Pick a plan");
      await user.tab();
      await vi.waitFor(() => expect(container.textContent).toContain("Pick a plan"));
    },
  );

  it("a checkbox group is validated when focus leaves it, not when it moves inside it", async () => {
    const user = setupUser();
    const schema = z.object({ tags: z.array(z.enum(["a", "b", "c"])).min(1, "Pick a tag") });
    type In = { tags: string[] };
    function Blurry() {
      const form = useForm<In>({
        mode: "onBlur",
        resolver: zodResolver(schema) as never,
        defaultValues: { tags: [] },
      });
      return (
        <Form form={form} onSubmit={() => undefined}>
          <FormField<In> name="tags">
            <CheckboxGroup label="Tags" options={TAGS} />
          </FormField>
          <button type="button">After</button>
        </Form>
      );
    }
    const { container } = renderUi(<Blurry />);
    await user.tab();
    await user.tab();
    expect(container.textContent).not.toContain("Pick a tag");
    await user.tab();
    await user.tab();
    await vi.waitFor(() => expect(container.textContent).toContain("Pick a tag"));
  });

  it("takes the label, description and required from FormField when the control has none", () => {
    function Labelled() {
      const form = useForm<{ terms: boolean }>({ defaultValues: { terms: false } });
      return (
        <Form form={form} onSubmit={() => undefined}>
          <FormField<{ terms: boolean }>
            name="terms"
            label="Terms"
            description="Read them."
            required
          >
            <Checkbox label="placeholder" />
          </FormField>
        </Form>
      );
    }
    const { container } = renderUi(<Labelled />);
    const box = within(container).getByRole("checkbox", { name: "Terms" });
    expect(box.getAttribute("aria-required")).toBe("true");
    expect(container.textContent).toContain("Read them.");
  });
});
