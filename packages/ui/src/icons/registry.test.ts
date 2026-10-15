import { Check, Search } from "lucide-react";
import { afterEach, describe, expect, it } from "vitest";
import { getIcon, registeredIconNames, registerIcons, resetIcons } from "./registry.js";

afterEach(() => resetIcons());

describe("registerIcons", () => {
  it("registers icons by name and returns them from getIcon", () => {
    registerIcons({ "my-check": Check, search: Search });
    expect(getIcon("my-check")).toBe(Check);
    expect(getIcon("search")).toBe(Search);
    expect(registeredIconNames().sort()).toEqual(["my-check", "search"]);
  });

  it("returns undefined for unknown names", () => {
    expect(getIcon("missing")).toBeUndefined();
  });

  it("lets a later registration replace an earlier one (hot reload, theming)", () => {
    registerIcons({ a: Check });
    registerIcons({ a: Search });
    expect(getIcon("a")).toBe(Search);
  });

  it.each([
    "Check",
    "my_check",
    "my check",
    "-leading",
    "trailing-",
    "double--dash",
    "",
    "has/slash",
    "ünïcode",
  ])("rejects the invalid name %j", (name) => {
    expect(() => registerIcons({ [name]: Check })).toThrow(TypeError);
  });

  it("rejects values that are not components", () => {
    for (const bad of [null, undefined, 42, "svg", {}, []]) {
      expect(() => registerIcons({ ok: bad as never })).toThrow(TypeError);
    }
  });

  it("accepts forwardRef and memo components (objects with $$typeof)", () => {
    expect(() => registerIcons({ lucide: Check })).not.toThrow();
  });

  it("is atomic: one invalid entry registers nothing", () => {
    expect(() => registerIcons({ good: Check, Bad: Search })).toThrow(TypeError);
    expect(getIcon("good")).toBeUndefined();
  });

  it("is not affected by prototype keys", () => {
    registerIcons({ constructor: Check });
    expect(getIcon("constructor")).toBe(Check);
    expect(getIcon("toString")).toBeUndefined();
    expect(getIcon("__proto__")).toBeUndefined();
  });
});
