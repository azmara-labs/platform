import { within } from "@testing-library/dom";
import { describe, expect, it, vi } from "vitest";
import { renderUi, setupUser } from "../../test-utils/index.js";
import { Checkbox, CheckboxGroup, RadioGroup, Switch } from "./index.js";
import type { ChoiceOption } from "./types.js";

// Hostile strings, run through every control as a label, a description, an error, a group legend,
// and an option's value, label and description. Whatever is given, the person sees it as literal
// text, and nothing in it becomes markup, an attribute, a handler, an id or a key on a prototype.
const PAYLOADS = [
  '"><img src=x onerror=alert(1)>',
  "<script>alert(1)</script>",
  "</script><script>alert(1)</script>",
  "__proto__",
  "constructor",
  "javascript:alert(1)",
  "x".repeat(10_000),
  "a‮b",
  "",
] as const;

const name = (payload: string) =>
  (payload.length > 28 ? `${payload.slice(0, 28)}…` : payload) || "(empty)";

function everything(payload: string) {
  const options: ChoiceOption[] = [
    { value: payload, label: payload, description: payload },
    { value: "safe", label: "Safe" },
  ];
  return (
    <div>
      <Checkbox label={payload} description={payload} error={payload} />
      <Switch label={payload} description={payload} error={payload} />
      <RadioGroup label={payload} description={payload} error={payload} options={options} />
      <CheckboxGroup
        label={payload}
        description={payload}
        error={payload}
        options={options}
        selectAllLabel={payload}
      />
    </div>
  );
}

const protoKeys = () => Object.getOwnPropertyNames(Object.prototype).sort();

describe.each(PAYLOADS)("hostile input %j", (payload) => {
  it(`${name(payload)}: shows as literal text and creates no elements or handlers`, () => {
    const before = protoKeys();
    const { container } = renderUi(everything(payload));
    expect(container.textContent).toContain(payload);
    expect(container.querySelectorAll("img, script, iframe, style, object, embed")).toHaveLength(0);
    for (const el of Array.from(container.querySelectorAll("*"))) {
      for (const attr of Array.from(el.attributes)) {
        expect(attr.name.startsWith("on"), `${el.tagName} has ${attr.name}`).toBe(false);
        expect(attr.name.startsWith("data-evil")).toBe(false);
      }
      // No link anywhere can carry the payload as an href.
      expect(el.getAttribute("href")).toBeNull();
    }
    expect(protoKeys()).toEqual(before);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it(`${name(payload)}: ids never come from option values and stay unique`, () => {
    const { container } = renderUi(everything(payload));
    const ids = Array.from(container.querySelectorAll("[id]")).map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
    if (payload && payload.length < 100) {
      for (const id of ids) expect(id.includes(payload), id).toBe(false);
    }
    // Nothing in the page is addressed by a selector built from a value: every id is plain.
    for (const id of ids) expect(id).toMatch(/^[\w:.-]+$/);
  });

  it(`${name(payload)}: the hidden inputs carry the value as data, escaped by the DOM`, async () => {
    if (!payload) return;
    const user = setupUser();
    const { container } = renderUi(
      <form>
        <RadioGroup name="r" label="R" options={[{ value: payload, label: "Hostile" }]} />
        <CheckboxGroup name="c" label="C" options={[{ value: payload, label: "Hostile" }]} />
      </form>,
    );
    // A radio's input always carries its value; a checkbox's does once it is ticked.
    await user.click(within(container).getByRole("checkbox", { name: "Hostile" }));
    const inputs = Array.from(container.querySelectorAll("input")) as HTMLInputElement[];
    expect(inputs.some((i) => i.type === "radio" && i.value === payload)).toBe(true);
    expect(inputs.some((i) => i.type === "checkbox" && i.value === payload)).toBe(true);
    const form = container.querySelector("form") as HTMLFormElement;
    expect(new FormData(form).getAll("c")).toEqual([payload]);
    expect(container.querySelectorAll("img, script")).toHaveLength(0);
  });

  it(`${name(payload)}: choosing the option reports exactly that string and changes nothing else`, async () => {
    if (!payload) return;
    const user = setupUser();
    const before = protoKeys();
    const radio = vi.fn();
    const checks = vi.fn();
    const { container } = renderUi(
      <div>
        <RadioGroup
          label="R"
          options={[
            { value: payload, label: "Hostile" },
            { value: "safe", label: "Safe" },
          ]}
          onValueChange={radio}
        />
        <CheckboxGroup
          label="C"
          options={[
            { value: payload, label: "Hostile" },
            { value: "safe", label: "Safe" },
          ]}
          selectAllLabel="All"
          onValueChange={checks}
        />
      </div>,
    );
    const radios = within(container).getByRole("radiogroup");
    const group = within(container).getByRole("group");
    await user.click(within(radios).getByText("Hostile"));
    expect(radio.mock.calls[0]?.[0]).toBe(payload);
    expect(within(radios).getByRole("radio", { name: "Safe" }).getAttribute("aria-checked")).toBe(
      "false",
    );

    await user.click(within(group).getByText("Hostile"));
    expect(checks.mock.calls[0]?.[0]).toEqual([payload]);
    expect(within(group).getByRole("checkbox", { name: "Safe" }).getAttribute("aria-checked")).toBe(
      "false",
    );
    // Select all keeps working with a hostile value in the set.
    await user.click(within(group).getByRole("checkbox", { name: "All" }));
    const last = checks.mock.calls.at(-1)?.[0] as string[] | undefined;
    expect([...(last ?? [])].sort()).toEqual([payload, "safe"].sort());
    expect(protoKeys()).toEqual(before);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe("option objects carry data, not behaviour", () => {
  const hostile = {
    value: "a",
    label: "A",
    onClick: () => {
      throw new Error("an option handler must never be wired");
    },
    onClickText: "alert(1)",
    href: "javascript:alert(1)",
    src: "javascript:alert(1)",
    style: "background:url(javascript:alert(1))",
    className: "evil",
    id: "evil-id",
    dangerouslySetInnerHTML: { __html: "<img src=x onerror=alert(1)>" },
    "data-evil": "1",
    "aria-label": "evil",
  } as unknown as ChoiceOption;

  it.each([
    ["RadioGroup", <RadioGroup key="r" label="G" options={[hostile]} />],
    ["CheckboxGroup", <CheckboxGroup key="c" label="G" options={[hostile]} />],
  ])("%s ignores every field but the four it reads", async (_who, ui) => {
    const user = setupUser();
    const { container } = renderUi(ui);
    const html = container.innerHTML;
    expect(container.querySelector("img")).toBeNull();
    for (const needle of [
      "javascript:",
      "data-evil",
      "evil-id",
      "evil",
      "background:url",
      "onclick",
    ]) {
      expect(html, needle).not.toContain(needle);
    }
    // Clicking runs no option handler.
    await user.click(within(container).getByText("A"));
  });
});

describe("a stale or unknown value from a server", () => {
  it("is carried through as data and never rendered as markup", () => {
    const stale = '"><img src=x onerror=alert(1)>';
    const { container } = renderUi(
      <CheckboxGroup
        label="C"
        options={[{ value: "a", label: "A" }]}
        value={[stale, "__proto__"]}
      />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(
      within(container).getByRole("checkbox", { name: "A" }).getAttribute("aria-checked"),
    ).toBe("false");
  });
});
