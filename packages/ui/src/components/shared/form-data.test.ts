import { describe, expect, it } from "vitest";
import type { FieldDef, FieldType } from "./field-def.js";
import { formDataToValues } from "./form-data.js";

const field = (name: string, type: FieldType): FieldDef => ({
  name,
  label: name,
  type,
  required: true,
});

const post = (entries: [string, string | File][]) => {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
};

describe("formDataToValues: booleans", () => {
  const fields = [field("terms", "boolean")];

  it("is false when absent, because an unticked checkbox posts nothing", () => {
    expect(formDataToValues(post([]), fields)).toEqual({ terms: false });
  });

  it.each(["on", "true"])("is true for exactly one entry equal to %s", (value) => {
    expect(formDataToValues(post([["terms", value]]), fields)).toEqual({ terms: true });
  });

  it.each(["false", "1", "yes", "", "ON", " on"])(
    "passes %j through as a string so the schema rejects it",
    (value) => {
      expect(formDataToValues(post([["terms", value]]), fields)).toEqual({ terms: value });
    },
  );

  it("with two entries is passed through as an array, never true", () => {
    expect(
      formDataToValues(
        post([
          ["terms", "on"],
          ["terms", "on"],
        ]),
        fields,
      ),
    ).toEqual({ terms: ["on", "on"] });
  });

  it("with only a file entry is undefined", () => {
    const values = formDataToValues(post([["terms", new File(["x"], "x.txt")]]), fields);
    expect(values.terms).toBeUndefined();
  });
});

describe("formDataToValues: multiselect, enum and the rest", () => {
  it("multiselect is every string entry for the name, files dropped, [] when none", () => {
    const fields = [field("tags", "multiselect")];
    expect(formDataToValues(post([]), fields)).toEqual({ tags: [] });
    expect(
      formDataToValues(
        post([
          ["tags", "a"],
          ["tags", new File(["x"], "x.txt")],
          ["tags", "c"],
        ]),
        fields,
      ),
    ).toEqual({ tags: ["a", "c"] });
  });

  it("enum and other fields are the single string, undefined when absent or a file", () => {
    const fields = [field("plan", "enum"), field("name", "text"), field("avatar", "custom")];
    const values = formDataToValues(
      post([
        ["plan", "pro"],
        ["name", ""],
        ["avatar", new File(["x"], "x.png")],
      ]),
      fields,
    );
    expect(values).toEqual({ plan: "pro", name: "" });
    expect("avatar" in values).toBe(false);
    expect(Object.keys(formDataToValues(post([]), fields))).toEqual([]);
  });

  it("a key posted more than once on a single-value field is an array, so the schema rejects it", () => {
    const values = formDataToValues(
      post([
        ["plan", "free"],
        ["plan", "pro"],
      ]),
      [field("plan", "enum")],
    );
    expect(values).toEqual({ plan: ["free", "pro"] });
  });
});

describe("formDataToValues: only the schema's fields", () => {
  it("ignores keys that are not fields, including __proto__ and constructor", () => {
    const values = formDataToValues(
      post([
        ["plan", "pro"],
        ["__proto__", "polluted"],
        ["constructor", "x"],
        ["isAdmin", "true"],
        ["polluted", "yes"],
      ]),
      [field("plan", "enum")],
    );
    expect(Object.keys(values)).toEqual(["plan"]);
    expect(Object.getPrototypeOf(values)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("a field that is itself called __proto__ becomes an own property, never the prototype", () => {
    const values = formDataToValues(post([["__proto__", "x"]]), [field("__proto__", "text")]);
    expect(Object.getPrototypeOf(values)).toBe(Object.prototype);
    expect(Object.keys(values)).toEqual(["__proto__"]);
  });
});
