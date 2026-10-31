import { createRef, type ReactNode } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { Button } from "../button/button.js";
import { Input } from "../input/input.js";
import { zodResolver } from "../zod/resolver.js";
import { Form, FormField, FormFieldArray, type FormFieldArrayRow } from "./index.js";

const schema = z.object({
  lines: z
    .array(
      z.object({
        description: z.string().trim().min(1, "Enter a description"),
        qty: z.coerce.number<string>().positive("Enter a quantity"),
      }),
    )
    .min(1, "Add at least one line"),
});
type Input_ = z.input<typeof schema>;
type Output = z.output<typeof schema>;

function Invoice({
  onSave,
  lines = [{ description: "Callout", qty: "1" }],
  footer,
}: {
  onSave: (values: Output) => void;
  lines?: Input_["lines"];
  footer?: (lines: Input_["lines"]) => ReactNode;
}) {
  const form = useForm<Input_, unknown, Output>({
    resolver: zodResolver(schema),
    defaultValues: { lines },
  });
  return (
    <Form form={form} onSubmit={onSave}>
      <FormFieldArray<Input_, "lines">
        name="lines"
        legend="Line items"
        itemLabel={(index) => `Line ${index + 1}`}
        newItem={() => ({ description: "", qty: "1" })}
        footer={footer}
      >
        {(_, row) => (
          <>
            <FormField name={row.name("description")} label={`Description ${row.index + 1}`}>
              <Input />
            </FormField>
            <FormField name={row.name("qty")} label={`Quantity ${row.index + 1}`}>
              <Input inputMode="decimal" />
            </FormField>
          </>
        )}
      </FormFieldArray>
      <Button type="submit">Save</Button>
    </Form>
  );
}

const byLabel = (text: string) => {
  const label = Array.from(document.querySelectorAll("label")).find((l) =>
    l.textContent?.startsWith(text),
  ) as HTMLLabelElement;
  return document.getElementById(label.htmlFor) as HTMLInputElement;
};
const buttonNamed = (name: string) =>
  (document.querySelector(`button[aria-label="${name}"]`) ??
    Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.includes(name),
    )) as HTMLButtonElement;

describe("FormFieldArray", () => {
  it("registers each row's fields under the array path", () => {
    renderUi(<Invoice onSave={vi.fn()} />);
    expect(byLabel("Description 1").name).toBe("lines.0.description");
    expect(byLabel("Quantity 1").name).toBe("lines.0.qty");
  });

  it("adds a row from newItem, focuses it, and submits every row's values", async () => {
    const onSave = vi.fn();
    const user = setupUser();
    renderUi(<Invoice onSave={onSave} />);
    const add = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent === "Add",
    ) as HTMLButtonElement;
    await user.click(add);
    expect(document.activeElement).toBe(byLabel("Description 2"));
    await user.type(byLabel("Description 2"), "Tow, 12 km");
    await user.click(buttonNamed("Save"));
    expect(onSave).toHaveBeenCalledWith(
      {
        lines: [
          { description: "Callout", qty: 1 },
          { description: "Tow, 12 km", qty: 1 },
        ],
      },
      expect.anything(),
    );
  });

  it("submits rows in their new order after a keyboard move", async () => {
    const onSave = vi.fn();
    const user = setupUser();
    renderUi(
      <Invoice
        onSave={onSave}
        lines={[
          { description: "Callout", qty: "1" },
          { description: "Tow", qty: "2" },
        ]}
      />,
    );
    buttonNamed("Move Line 2").focus();
    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(buttonNamed("Move Line 1"));
    await user.click(buttonNamed("Save"));
    expect(onSave.mock.calls[0]?.[0]).toEqual({
      lines: [
        { description: "Tow", qty: 2 },
        { description: "Callout", qty: 1 },
      ],
    });
  });

  it("shows each row's field errors and the array's own error", async () => {
    const user = setupUser();
    const { container } = renderUi(<Invoice onSave={vi.fn()} lines={[]} />);
    await user.click(buttonNamed("Save"));
    expect(container.textContent).toContain("Add at least one line");

    await user.click(buttonNamed("Add"));
    await user.clear(byLabel("Quantity 1"));
    await user.type(byLabel("Quantity 1"), "0");
    await user.click(buttonNamed("Save"));
    expect(container.textContent).toContain("Enter a description");
    expect(container.textContent).toContain("Enter a quantity");
    expect(container.textContent).not.toContain("Add at least one line");
  });

  it("removes a row from the form values", async () => {
    const onSave = vi.fn();
    const user = setupUser();
    renderUi(
      <Invoice
        onSave={onSave}
        lines={[
          { description: "Callout", qty: "1" },
          { description: "Tow", qty: "2" },
        ]}
      />,
    );
    await user.click(buttonNamed("Remove Line 1"));
    expect(document.activeElement).toBe(byLabel("Description 1"));
    await user.click(buttonNamed("Save"));
    expect(onSave.mock.calls[0]?.[0]).toEqual({ lines: [{ description: "Tow", qty: 2 }] });
  });

  it("re-renders the footer with the current values as people type", async () => {
    const user = setupUser();
    const footer = (lines: Input_["lines"]) => (
      <output>{lines.reduce((sum, line) => sum + Number(line.qty || 0), 0)} items</output>
    );
    const { container } = renderUi(<Invoice onSave={vi.fn()} footer={footer} />);
    expect(container.querySelector("output")?.textContent).toBe("1 items");
    await user.clear(byLabel("Quantity 1"));
    await user.type(byLabel("Quantity 1"), "3");
    expect(container.querySelector("output")?.textContent).toBe("3 items");
    await user.click(buttonNamed("Add"));
    expect(container.querySelector("output")?.textContent).toBe("4 items");
  });

  it("hides the handle and remove buttons when not sortable or removable", () => {
    function Fixed() {
      const form = useForm({ defaultValues: { tags: [{ text: "a" }] } });
      return (
        <Form form={form} onSubmit={() => {}}>
          <FormFieldArray name="tags" legend="Tags" sortable={false} removable={false}>
            {(_, row) => (
              <FormField name={row.name("text")} label="Tag">
                <Input />
              </FormField>
            )}
          </FormFieldArray>
        </Form>
      );
    }
    const { container } = renderUi(<Fixed />);
    expect(container.querySelector("[data-slot=field-array-handle]")).toBeNull();
    expect(container.querySelector("[data-slot=field-array-remove]")).toBeNull();
    expect(container.querySelector("[data-slot=field-array] button")).toBeNull();
  });

  it("has no axe violations after a failed submit", async () => {
    const user = setupUser();
    const { container } = renderUi(<Invoice onSave={vi.fn()} lines={[]} />);
    await user.click(buttonNamed("Save"));
    await expectNoA11yViolations(container);
  });
});

describe("FormFieldArray with your own useFieldArray", () => {
  function Catalog({ onSave }: { onSave: (values: Output) => void }) {
    const form = useForm<Input_, unknown, Output>({
      resolver: zodResolver(schema),
      defaultValues: { lines: [{ description: "", qty: "1" }] },
    });
    const lines = useFieldArray({ control: form.control, name: "lines" });
    return (
      <Form form={form} onSubmit={onSave}>
        <Button
          onClick={() =>
            lines.replace([
              ...form.getValues("lines").filter((line) => line.description !== ""),
              { description: "Callout", qty: "1" },
            ])
          }
        >
          Add callout
        </Button>
        <FormFieldArray<Input_, "lines">
          name="lines"
          fieldArray={lines}
          legend="Line items"
          itemLabel={(index) => `Line ${index + 1}`}
          newItem={() => ({ description: "", qty: "1" })}
        >
          {(_, row) => (
            <>
              <FormField name={row.name("description")} label={`Description ${row.index + 1}`}>
                <Input />
              </FormField>
              <FormField name={row.name("qty")} label={`Quantity ${row.index + 1}`}>
                <Input inputMode="decimal" />
              </FormField>
            </>
          )}
        </FormFieldArray>
        <Button type="submit">Save</Button>
      </Form>
    );
  }

  it("shows rows changed from outside it, and still adds and submits", async () => {
    const user = setupUser();
    const onSave = vi.fn();
    renderUi(<Catalog onSave={onSave} />);
    // The blank line is replaced, not kept.
    await user.click(buttonNamed("Add callout"));
    expect((byLabel("Description 1") as HTMLInputElement).value).toBe("Callout");
    expect(document.querySelectorAll("[data-slot=field-array-row]")).toHaveLength(1);

    const add = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent === "Add",
    ) as HTMLButtonElement;
    await user.click(add);
    expect(document.activeElement).toBe(byLabel("Description 2"));
    await user.type(byLabel("Description 2"), "Labour");
    await user.click(buttonNamed("Save"));
    await vi.waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0]?.[0]).toEqual({
      lines: [
        { description: "Callout", qty: 1 },
        { description: "Labour", qty: 1 },
      ],
    });
  });

  it("types row.name() against the array's items", () => {
    type Typed = FormFieldArrayRow<Input_, "lines">;
    const name: Typed["name"] = (field) => `lines.0.${field}`;
    const qty: "lines.0.qty" | `lines.${number}.qty` = name("qty");
    expect(qty).toBe("lines.0.qty");
    // @ts-expect-error: not a field of a line
    name("price");
  });
});

describe("FormField keeps the control's own ref", () => {
  it("gives the caller's object ref and register() the same input", async () => {
    const ref = createRef<HTMLInputElement>();
    const onSave = vi.fn();
    const user = setupUser();
    function Profile() {
      const form = useForm({ defaultValues: { name: "" } });
      return (
        <Form form={form} onSubmit={onSave}>
          <FormField name="name" label="Name" rules={{ required: "Enter your name" }}>
            <Input ref={ref} />
          </FormField>
          <Button type="submit">Save</Button>
        </Form>
      );
    }
    renderUi(<Profile />);
    expect(ref.current).toBe(byLabel("Name"));
    // register() still has the input: a failed submit focuses it.
    await user.click(buttonNamed("Save"));
    expect(document.activeElement).toBe(ref.current);
    await user.type(byLabel("Name"), "Aroha");
    await user.click(buttonNamed("Save"));
    expect(onSave.mock.calls[0]?.[0]).toEqual({ name: "Aroha" });
  });

  it("calls the caller's callback ref", () => {
    const seen: (HTMLInputElement | null)[] = [];
    function Profile() {
      const form = useForm({ defaultValues: { name: "" } });
      return (
        <Form form={form} onSubmit={() => {}}>
          <FormField name="name" label="Name">
            <Input ref={(node) => void seen.push(node)} />
          </FormField>
        </Form>
      );
    }
    renderUi(<Profile />);
    expect(seen.some((node) => node === byLabel("Name"))).toBe(true);
  });
});
