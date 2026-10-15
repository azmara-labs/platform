import { describe, expect, it } from "vitest";
import { cn } from "./cn.js";

describe("cn", () => {
  it("joins class names and drops falsy values", () => {
    expect(cn("a", false, null, undefined, "b", 0 && "c")).toBe("a b");
  });

  it("supports conditional object and array syntax", () => {
    expect(cn("base", { active: true, disabled: false }, ["x", ["y"]])).toBe("base active x y");
  });

  it("lets later Tailwind utilities override earlier conflicting ones", () => {
    expect(cn("p-2 text-sm", "p-4")).toBe("text-sm p-4");
    expect(cn("bg-primary text-primary-foreground", "bg-destructive")).toBe(
      "text-primary-foreground bg-destructive",
    );
  });

  it("keeps non-conflicting utilities from both sides", () => {
    expect(cn("px-2", "py-4")).toBe("px-2 py-4");
  });

  it("returns an empty string when given nothing useful", () => {
    expect(cn()).toBe("");
    expect(cn(false, null, undefined)).toBe("");
  });
});
