import { describe, expect, it } from "vitest";
import {
  type ComponentItem,
  filterComponents,
  groupComponents,
  groupId,
  STATUS_LABELS,
} from "./component-index";

const item = (title: string, group: ComponentItem["group"], description = ""): ComponentItem => ({
  title,
  description,
  url: `/docs/components/${title.toLowerCase()}`,
  group,
  status: "stable",
  since: "0.2.0",
});

const items = [
  item("Toast", "Feedback", "Brief messages that do not block the page"),
  item("Button", "Inputs", "Variants, sizes and a loading state"),
  item("Modal", "Overlays", "Dialog, AlertDialog and Drawer"),
  item("Input", "Inputs", "The real input element"),
  item("Menu", "Overlays", "Dropdown and context menus"),
];

describe("filterComponents", () => {
  it("returns everything with no filter", () => {
    expect(filterComponents(items)).toHaveLength(5);
    expect(filterComponents(items, { query: "   " })).toHaveLength(5);
  });

  it("filters by group", () => {
    expect(filterComponents(items, { group: "Inputs" }).map((i) => i.title)).toEqual([
      "Button",
      "Input",
    ]);
  });

  it("matches the title, description or group, ignoring case and extra spaces", () => {
    expect(filterComponents(items, { query: "TOAST" }).map((i) => i.title)).toEqual(["Toast"]);
    expect(filterComponents(items, { query: "alert  dialog" })).toHaveLength(0);
    expect(filterComponents(items, { query: "alertdialog" }).map((i) => i.title)).toEqual([
      "Modal",
    ]);
    expect(filterComponents(items, { query: "overlays" }).map((i) => i.title)).toEqual([
      "Modal",
      "Menu",
    ]);
  });

  it("combines the group and the text", () => {
    expect(
      filterComponents(items, { group: "Overlays", query: "menu" }).map((i) => i.title),
    ).toEqual(["Menu"]);
    expect(filterComponents(items, { group: "Inputs", query: "menu" })).toEqual([]);
  });
});

describe("groupComponents", () => {
  it("orders groups as the schema does and components by title, leaving empty groups out", () => {
    const grouped = groupComponents(items);
    expect(grouped.map((g) => g.group)).toEqual(["Inputs", "Feedback", "Overlays"]);
    expect(grouped[0]?.items.map((i) => i.title)).toEqual(["Button", "Input"]);
    expect(grouped[2]?.items.map((i) => i.title)).toEqual(["Menu", "Modal"]);
  });

  it("does not change the order of the list it is given", () => {
    const before = items.map((i) => i.title);
    groupComponents(items);
    expect(items.map((i) => i.title)).toEqual(before);
  });
});

describe("helpers", () => {
  it("builds a section id from the group name", () => {
    expect(groupId("Data display")).toBe("data-display");
    expect(groupId("Layout")).toBe("layout");
  });

  it("labels every status", () => {
    expect(STATUS_LABELS).toEqual({ stable: "Stable", new: "New", beta: "Beta" });
  });
});
