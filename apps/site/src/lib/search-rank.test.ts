import { describe, expect, it } from "vitest";
import { normaliseText, rankResults } from "./search-rank";

const page = (title: string, url: string) => ({ type: "page", content: title, url });
const text = (content: string, url: string) => ({ type: "text", content, url });
const urls = (results: { type: string; url: string }[]) =>
  results.filter((r) => r.type === "page").map((r) => r.url);

describe("normaliseText", () => {
  it("drops highlight markup, punctuation and case, and splits CamelCase", () => {
    expect(normaliseText("<mark>`Button`</mark>,")).toBe("button");
    expect(normaliseText("DropdownMenu")).toBe("dropdown menu");
    expect(normaliseText("Next.js")).toBe("next js");
  });
});

describe("rankResults", () => {
  it("puts the page titled with the query first, keeping each page's sections with it", () => {
    const results = [
      page("@azmr/ui", "/ui"),
      text("`Button`, `buttonVariants`", "/ui#exports"),
      page("Button", "/button"),
      text("ButtonGroup", "/button#group"),
    ];
    const ranked = rankResults(results, "button");
    expect(urls(ranked)).toEqual(["/button", "/ui"]);
    expect(ranked.map((r) => r.url)).toEqual(["/button", "/button#group", "/ui", "/ui#exports"]);
  });

  it("treats an alias like the title", () => {
    const results = [
      page("Menu opens dialog", "/recipe"),
      page("Modal (Dialog, AlertDialog, Drawer)", "/modal"),
    ];
    expect(urls(rankResults(results, "dialog"))).toEqual(["/modal", "/recipe"]);
    // A CamelCase alias matches its words: "dropdown" finds DropdownMenu.
    const menu = [
      page("Dashboard shell", "/shell"),
      page("Menu (DropdownMenu, ContextMenu)", "/menu"),
    ];
    expect(urls(rankResults(menu, "dropdown"))).toEqual(["/menu", "/shell"]);
  });

  it("ranks a whole-phrase match above pages that only match the words", () => {
    const results = [
      page("Button", "/button"),
      text("Disabled buttons stay focusable", "/button#d"),
      page("Modal", "/modal"),
      text("Dialogs with a focus trap and scroll lock", "/modal#d"),
    ];
    expect(urls(rankResults(results, "focus trap"))).toEqual(["/modal", "/button"]);
  });

  it("keeps Orama's order within a tier and when nothing matches better", () => {
    const results = [page("Theming", "/a"), page("Tokens", "/b")];
    expect(urls(rankResults(results, "colour"))).toEqual(["/a", "/b"]);
    expect(rankResults(results, "  ")).toEqual(results);
  });
});
