import { describe, expect, it } from "vitest";
import { contrast, type Mode, over, tokenColour } from "../../test-utils/tokens.js";
import { buttonVariants } from "./button.js";

// A solid button darkens or lightens slightly on hover (`hover:bg-X/90` is the colour at 90% over
// the page). Its label must stay readable on that blended surface, in both modes, over both the
// page and a card. The alpha is read from the real class string, so the test follows the component.
const variants = [
  ["default", "primary"],
  ["destructive", "destructive"],
  ["success", "success"],
  ["warning", "warning"],
  ["info", "info"],
] as const;
const modes: Mode[] = ["light", "dark"];
const surfaces = ["background", "card"];

function hoverAlpha(classes: string, token: string): number {
  const match = new RegExp(`(?:^|\\s)hover:bg-${token}/(\\d+)(?:\\s|$)`).exec(classes);
  if (!match) throw new Error(`no hover:bg-${token}/N in "${classes}"`);
  return Number(match[1]) / 100;
}

describe("solid Button variants keep readable labels", () => {
  for (const mode of modes) {
    for (const [variant, token] of variants) {
      it(`${mode} ${variant}: label on the resting surface (>= 4.5:1)`, () => {
        const ratio = contrast(tokenColour(`${token}-foreground`, mode), tokenColour(token, mode));
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      for (const surface of surfaces) {
        it(`${mode} ${variant}: label on the hover surface over --${surface} (>= 4.5:1)`, () => {
          const alpha = hoverAlpha(buttonVariants({ variant }), token);
          const hover = over(tokenColour(surface, mode), tokenColour(token, mode), alpha);
          const ratio = contrast(tokenColour(`${token}-foreground`, mode), hover);
          expect(ratio).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
  }

  it("reads the hover alpha from the class string", () => {
    expect(hoverAlpha("a hover:bg-success/90 b", "success")).toBe(0.9);
    expect(() => hoverAlpha("hover:bg-success", "success")).toThrow();
  });
});
