import { act, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser } from "../../test-utils/index.js";
import { Field } from "../field/field.js";
import { Input } from "../input/input.js";
import { FieldArray, type FieldArrayProps } from "./index.js";

type Contact = { id: string; name: string };

let nextId = 0;
const contact = (name = ""): Contact => ({ id: `c${++nextId}`, name });

type HarnessProps = Partial<Omit<FieldArrayProps<Contact>, "items" | "children">> & {
  initial?: Contact[];
  onChange?: (items: Contact[]) => void;
};

/** A FieldArray over plain React state, the way a form without a form library uses it. */
function Contacts({ initial = [], onChange, ...props }: HarnessProps) {
  const [items, setItems] = useState(initial);
  const update = (next: Contact[]) => {
    setItems(next);
    onChange?.(next);
  };
  return (
    <FieldArray<Contact>
      legend="Contacts"
      items={items}
      itemLabel={(index) => `Contact ${index + 1}`}
      onAdd={() => update([...items, contact()])}
      onRemove={(index) => update(items.filter((_, i) => i !== index))}
      onMove={(from, to) => {
        const next = [...items];
        const [moved] = next.splice(from, 1);
        if (moved) next.splice(to, 0, moved);
        update(next);
      }}
      {...props}
    >
      {(item, row) => (
        <Field label={`Name ${row.index + 1}`}>
          <Input name={row.name("name")} defaultValue={item.name} />
        </Field>
      )}
    </FieldArray>
  );
}

const three = () => [contact("Aroha"), contact("Mere"), contact("Tama")];
const button = (name: string) =>
  document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`) as HTMLButtonElement;
const addButton = () =>
  Array.from(document.querySelectorAll("button")).find((b) =>
    b.textContent?.includes("Add"),
  ) as HTMLButtonElement;
const names = () =>
  Array.from(document.querySelectorAll<HTMLInputElement>("input")).map((input) => input.value);
const status = () => document.querySelector('[role="status"]')?.textContent?.trim();

describe("FieldArray", () => {
  it("renders the legend, one row per item with named fields, and labelled row buttons", () => {
    const { container } = renderUi(<Contacts initial={three()} name="contacts" />);
    expect(container.querySelector("legend, [data-slot=field-array] > div")?.textContent).toContain(
      "Contacts",
    );
    expect(container.querySelectorAll("[data-slot=field-array-row]")).toHaveLength(3);
    expect(names()).toEqual(["Aroha", "Mere", "Tama"]);
    expect(
      Array.from(container.querySelectorAll("input")).map((input) => input.getAttribute("name")),
    ).toEqual(["contacts.0.name", "contacts.1.name", "contacts.2.name"]);
    expect(button("Remove Contact 2")).toBeTruthy();
    const handle = button("Move Contact 2");
    expect(handle).toBeTruthy();
    const hint = document.getElementById(handle.getAttribute("aria-describedby") ?? "");
    expect(hint?.textContent).toContain("arrow keys");
  });

  it("shows the empty state when there are no rows", () => {
    const { container } = renderUi(<Contacts empty="No contacts yet." />);
    expect(container.querySelector("[data-slot=field-array-empty]")?.textContent).toBe(
      "No contacts yet.",
    );
    expect(container.querySelector("ul")).toBeNull();
  });

  it("renders column headings hidden from screen readers, with spacers for the row buttons", () => {
    const { container } = renderUi(<Contacts initial={three()} header={<span>Name</span>} />);
    const header = container.querySelector("[data-slot=field-array-header]");
    expect(header?.getAttribute("aria-hidden")).toBe("true");
    expect(header?.textContent).toBe("Name");
    // Handle and remove button spacers, so the headings sit over the fields.
    expect(header?.querySelectorAll("span.w-8")).toHaveLength(2);
    const empty = renderUi(<Contacts header={<span>Name</span>} />);
    expect(empty.container.querySelector("[data-slot=field-array-header]")).toBeNull();
  });

  it("passes the rows to the footer render prop", () => {
    const footer = vi.fn((items: readonly Contact[]) => <p>{items.length} contacts</p>);
    const { container } = renderUi(<Contacts initial={three()} footer={footer} />);
    expect(container.querySelector("[data-slot=field-array-footer]")?.textContent).toBe(
      "3 contacts",
    );
  });

  it("moves focus to the new row's first field when a row is added, and announces it", async () => {
    const user = setupUser();
    renderUi(<Contacts initial={three()} />);
    await user.click(addButton());
    const inputs = document.querySelectorAll("input");
    expect(inputs).toHaveLength(4);
    expect(document.activeElement).toBe(inputs[3]);
    expect(status()).toBe("Contact 4 added. 4 rows.");
  });

  it("moves focus to the row that takes a removed row's place, and announces it", async () => {
    const user = setupUser();
    renderUi(<Contacts initial={three()} />);
    await user.click(button("Remove Contact 2"));
    expect(names()).toEqual(["Aroha", "Tama"]);
    expect(document.activeElement).toBe(document.querySelectorAll("input")[1]);
    expect(status()).toBe("Contact 2 removed. 2 rows left.");
  });

  it("moves focus to the previous row when the last row is removed", async () => {
    const user = setupUser();
    renderUi(<Contacts initial={three()} />);
    await user.click(button("Remove Contact 3"));
    expect(document.activeElement).toBe(document.querySelectorAll("input")[1]);
  });

  it("moves focus to the add button when the only row is removed", async () => {
    const user = setupUser();
    renderUi(<Contacts initial={[contact("Aroha")]} />);
    await user.click(button("Remove Contact 1"));
    expect(document.querySelectorAll("input")).toHaveLength(0);
    expect(document.activeElement).toBe(addButton());
    expect(status()).toBe("Contact 1 removed. 0 rows left.");
  });

  it("moves focus to the group when the only row is removed and there is no add button", async () => {
    const user = setupUser();
    const { container } = renderUi(<Contacts initial={[contact("Aroha")]} onAdd={undefined} />);
    await user.click(button("Remove Contact 1"));
    expect(document.activeElement).toBe(container.querySelector("[data-slot=field-array]"));
  });

  it("re-announces the same message, so two removals in a row are both heard", async () => {
    const user = setupUser();
    renderUi(<Contacts initial={[...three(), contact("Hemi")]} />);
    await user.click(button("Remove Contact 4"));
    const first = document.querySelector('[role="status"]')?.textContent;
    await user.click(button("Remove Contact 2"));
    await user.click(button("Remove Contact 2"));
    expect(document.querySelector('[role="status"]')?.textContent).not.toBe(first);
  });

  it("disables remove at the minimum and add at the maximum, keeping both focusable", async () => {
    const user = setupUser();
    renderUi(<Contacts initial={[contact("Aroha"), contact("Mere")]} min={2} max={3} />);
    const remove = button("Remove Contact 1");
    expect(remove.getAttribute("aria-disabled")).toBe("true");
    await user.click(remove);
    expect(names()).toHaveLength(2);
    await user.click(addButton());
    expect(names()).toHaveLength(3);
    expect(addButton().getAttribute("aria-disabled")).toBe("true");
    await user.click(addButton());
    expect(names()).toHaveLength(3);
    expect(button("Remove Contact 1").getAttribute("aria-disabled")).not.toBe("true");
  });

  it("reorders with the arrow keys, Home and End on the handle, keeping focus on it", async () => {
    const user = setupUser();
    const onChange = vi.fn();
    renderUi(<Contacts initial={three()} onChange={onChange} />);
    button("Move Contact 1").focus();
    await user.keyboard("{ArrowDown}");
    expect(names()).toEqual(["Mere", "Aroha", "Tama"]);
    expect(document.activeElement).toBe(button("Move Contact 2"));
    expect(status()).toBe("Contact 1 moved to position 2 of 3.");

    await user.keyboard("{End}");
    expect(names()).toEqual(["Mere", "Tama", "Aroha"]);
    expect(document.activeElement).toBe(button("Move Contact 3"));

    await user.keyboard("{Home}");
    expect(names()).toEqual(["Aroha", "Mere", "Tama"]);
    expect(document.activeElement).toBe(button("Move Contact 1"));

    onChange.mockClear();
    await user.keyboard("{ArrowUp}");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("reorders with move buttons, moving focus to the other one at an edge", async () => {
    const user = setupUser();
    renderUi(<Contacts initial={three()} moveButtons />);
    expect(button("Move Contact 1 up").getAttribute("aria-disabled")).toBe("true");
    await user.click(button("Move Contact 2 up"));
    expect(names()).toEqual(["Mere", "Aroha", "Tama"]);
    // The moved row is first now, so its up button is disabled: focus goes to its handle.
    expect(document.activeElement).toBe(button("Move Contact 1"));
    await user.click(button("Move Contact 1 down"));
    expect(names()).toEqual(["Aroha", "Mere", "Tama"]);
    expect(document.activeElement).toBe(button("Move Contact 2 down"));
  });

  it("hides the handle and remove buttons when there is no onMove or onRemove", () => {
    const { container } = renderUi(
      <Contacts initial={three()} onMove={undefined} onRemove={undefined} />,
    );
    expect(container.querySelector("[data-slot=field-array-handle]")).toBeNull();
    expect(container.querySelector("[data-slot=field-array-remove]")).toBeNull();
  });

  it("disables every control when disabled", () => {
    const { container } = renderUi(<Contacts initial={three()} disabled moveButtons />);
    expect(container.querySelector("[data-slot=field-array-handle]")).toBeNull();
    for (const control of Array.from(container.querySelectorAll("input"))) {
      expect(control.disabled).toBe(true);
    }
    expect(addButton().getAttribute("aria-disabled") ?? String(addButton().disabled)).toMatch(
      /true/,
    );
  });

  it("throws a helpful error when an item has no id or key", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      renderUi(
        <FieldArray legend="Tags" items={[{ text: "a" }]}>
          {() => null}
        </FieldArray>,
      ),
    ).toThrow(/getKey/);
    vi.mocked(console.error).mockRestore();
  });

  it("uses getKey for items without an id", async () => {
    const user = setupUser();
    function Tags() {
      const [items, setItems] = useState([{ slug: "red" }, { slug: "blue" }]);
      return (
        <FieldArray
          legend="Tags"
          items={items}
          getKey={(item) => item.slug}
          onRemove={(index) => setItems(items.filter((_, i) => i !== index))}
        >
          {(item) => <Input aria-label={item.slug} defaultValue={item.slug} />}
        </FieldArray>
      );
    }
    renderUi(<Tags />);
    await user.click(button("Remove Row 1"));
    expect(document.activeElement).toBe(document.querySelector('input[aria-label="blue"]'));
  });

  it("uses translated messages", () => {
    renderUi(
      <Contacts
        initial={[contact("Aroha")]}
        messages={{ add: "Tāpiri", remove: (label) => `Tango ${label}` }}
      />,
    );
    expect(addButton()).toBeUndefined();
    expect(
      Array.from(document.querySelectorAll("button")).some((b) => b.textContent === "Tāpiri"),
    ).toBe(true);
    expect(button("Tango Contact 1")).toBeTruthy();
  });

  it("has no axe violations, with rows, move buttons, a footer and an error", async () => {
    const { container } = renderUi(
      <Contacts
        initial={three()}
        moveButtons
        error="Add at least four contacts"
        footer={(items) => <p>{items.length} contacts</p>}
      />,
    );
    await expectNoA11yViolations(container);
  });
});

describe("FieldArray pointer drag", () => {
  const ROW = 40;
  const GAP = 12;

  /** Lays the rows out the way a browser would: 40 px tall, 12 px apart. */
  function layout(container: HTMLElement) {
    const list = container.querySelector("ul") as HTMLElement;
    list.style.rowGap = `${GAP}px`;
    Array.from(list.children).forEach((row, index) => {
      const top = index * (ROW + GAP);
      vi.spyOn(row, "getBoundingClientRect").mockReturnValue({
        top,
        bottom: top + ROW,
        height: ROW,
        left: 0,
        right: 300,
        width: 300,
        x: 0,
        y: top,
        toJSON: () => ({}),
      });
    });
  }

  function pointer(target: Element, type: string, clientY: number, pointerId = 1) {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientY, button: 0 });
    Object.defineProperty(event, "pointerId", { value: pointerId });
    act(() => {
      target.dispatchEvent(event);
    });
  }

  const rows = (container: HTMLElement) =>
    Array.from(container.querySelectorAll<HTMLElement>("[data-slot=field-array-row]"));

  it("drags a row past two others, shifting them aside, and drops it there", () => {
    const { container } = renderUi(<Contacts initial={three()} />);
    layout(container);
    const handle = button("Move Contact 1");
    pointer(handle, "pointerdown", 20);
    pointer(handle, "pointermove", 22);
    // Under the 4 px threshold: still a press, not a drag.
    expect(rows(container)[0]?.hasAttribute("data-dragging")).toBe(false);

    // Just past the third row's centre.
    const dy = 2 * (ROW + GAP) + 6;
    pointer(handle, "pointermove", 20 + dy);
    const [dragged, second, third] = rows(container);
    expect(dragged?.hasAttribute("data-dragging")).toBe(true);
    expect(dragged?.style.transform).toBe(`translateY(${dy}px)`);
    expect(second?.style.transform).toBe(`translateY(-${ROW + GAP}px)`);
    expect(third?.style.transform).toBe(`translateY(-${ROW + GAP}px)`);

    pointer(handle, "pointerup", 20 + dy);
    expect(names()).toEqual(["Mere", "Tama", "Aroha"]);
    expect(rows(container).every((row) => !row.style.transform)).toBe(true);
    expect(status()).toBe("Contact 1 moved to position 3 of 3.");
  });

  it("drags a row upwards", () => {
    const { container } = renderUi(<Contacts initial={three()} />);
    layout(container);
    const handle = button("Move Contact 3");
    const start = 2 * (ROW + GAP) + 20;
    pointer(handle, "pointerdown", start);
    pointer(handle, "pointermove", start - (ROW + GAP) - 6);
    expect(rows(container)[1]?.style.transform).toBe(`translateY(${ROW + GAP}px)`);
    pointer(handle, "pointerup", start - (ROW + GAP) - 6);
    expect(names()).toEqual(["Aroha", "Tama", "Mere"]);
  });

  it("does not move a row that is only clicked", () => {
    const onChange = vi.fn();
    const { container } = renderUi(<Contacts initial={three()} onChange={onChange} />);
    layout(container);
    const handle = button("Move Contact 1");
    pointer(handle, "pointerdown", 20);
    pointer(handle, "pointerup", 21);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("cancels a drag on Escape, and on pointercancel", () => {
    const onChange = vi.fn();
    const { container } = renderUi(<Contacts initial={three()} onChange={onChange} />);
    layout(container);
    const handle = button("Move Contact 1");
    handle.focus();
    pointer(handle, "pointerdown", 20);
    pointer(handle, "pointermove", 120);
    act(() => {
      handle.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(rows(container).every((row) => !row.style.transform)).toBe(true);
    pointer(handle, "pointerup", 120);
    expect(onChange).not.toHaveBeenCalled();

    pointer(handle, "pointerdown", 20);
    pointer(handle, "pointermove", 120);
    pointer(handle, "pointercancel", 120);
    pointer(handle, "pointerup", 120);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("ignores another pointer and non-primary buttons", () => {
    const onChange = vi.fn();
    const { container } = renderUi(<Contacts initial={three()} onChange={onChange} />);
    layout(container);
    const handle = button("Move Contact 1");
    pointer(handle, "pointerdown", 20, 1);
    pointer(handle, "pointermove", 120, 2);
    pointer(handle, "pointerup", 120, 2);
    expect(onChange).not.toHaveBeenCalled();
    pointer(handle, "pointerup", 20, 1);

    const right = new MouseEvent("pointerdown", { bubbles: true, clientY: 20, button: 2 });
    Object.defineProperty(right, "pointerId", { value: 3 });
    act(() => {
      handle.dispatchEvent(right);
    });
    pointer(handle, "pointermove", 120, 3);
    expect(rows(container)[0]?.hasAttribute("data-dragging")).toBe(false);
  });
});
