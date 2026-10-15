import { Check, Search } from "lucide-react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, renderUi } from "../test-utils/index.js";
import { createIconSet } from "./create-icon-set.js";
import { registerIcons, resetIcons } from "./registry.js";

afterEach(() => {
  resetIcons();
  vi.restoreAllMocks();
});

const set = createIconSet({ check: Check, search: Search });
const svg = (container: HTMLElement) => container.querySelector("svg") as SVGSVGElement;

describe("createIconSet", () => {
  it("renders an icon by name and exposes the names", () => {
    const { container } = renderUi(<set.Icon name="check" />);
    expect(svg(container).getAttribute("class")).toContain("lucide-check");
    expect([...set.names]).toEqual(["check", "search"]);
  });

  it("types names from the map", () => {
    // @ts-expect-error "nope" is not a name in this set
    const element = <set.Icon name="nope" />;
    expect(element).toBeTruthy();
  });

  it("supports the same props as Icon (size, aria-label, spin, ref)", async () => {
    const ref = createRef<SVGSVGElement>();
    const { container } = renderUi(
      <set.Icon name="search" size="lg" aria-label="Search" spin ref={ref} />,
    );
    expect(svg(container).getAttribute("class")).toContain("size-5");
    expect(svg(container).getAttribute("role")).toBe("img");
    expect(svg(container).getAttribute("class")).toContain("animate-spin");
    expect(ref.current).toBe(svg(container));
    await expectNoA11yViolations(container);
  });

  it("does not consult the global registry", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    registerIcons({ other: Check });
    const { container } = renderUi(<set.Icon name={"other" as never} />);
    expect(container.innerHTML).toBe("");
    expect(error).toHaveBeenCalledTimes(1);
  });

  it("does not resolve inherited object keys", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const name of ["constructor", "toString", "__proto__"]) {
      const { container } = renderUi(<set.Icon name={name as never} />);
      expect(container.innerHTML, name).toBe("");
    }
    expect(error).toHaveBeenCalledTimes(3);
  });

  it("freezes the names list so callers cannot mutate the set", () => {
    expect(Object.isFrozen(set.names)).toBe(true);
  });

  it("is independent of the input object (later mutation does not change the set)", () => {
    const input: Record<string, typeof Check> = { a: Check };
    const own = createIconSet(input);
    input.b = Search;
    expect([...own.names]).toEqual(["a"]);
  });
});
