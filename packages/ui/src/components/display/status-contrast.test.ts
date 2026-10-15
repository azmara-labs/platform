import { describe, expect, it } from "vitest";
import { alphaOf, contrast, type Mode, over, tokenColour } from "../../test-utils/tokens.js";
import { STATUS, type StatusVariant } from "./status.js";

// Alerts and badges paint a tint of a status colour over the page and put text on it. Contrast is
// computed on the blended surface, in both modes, over both the page and a card, from the same
// class names the components use (the alpha is read from them), so the check cannot drift.
const modes: Mode[] = ["light", "dark"];
const variants = Object.keys(STATUS) as StatusVariant[];
const surfaces = ["background", "card"];

describe("status surfaces: text and icons on the tinted background", () => {
  for (const mode of modes) {
    for (const variant of variants) {
      for (const surface of surfaces) {
        const status = STATUS[variant];

        it(`${mode} ${variant} badge: its text on its tint over --${surface} (>= 4.5:1)`, () => {
          const tint = over(
            tokenColour(surface, mode),
            tokenColour(status.token, mode),
            alphaOf(status.badge, "bg-\\S+"),
          );
          expect(contrast(tokenColour(status.textToken, mode), tint)).toBeGreaterThanOrEqual(4.5);
        });

        it(`${mode} ${variant} alert: body text on the tint over --${surface} (>= 4.5:1)`, () => {
          const tint = over(
            tokenColour(surface, mode),
            tokenColour(status.token, mode),
            alphaOf(status.alert, "bg-\\S+"),
          );
          expect(contrast(tokenColour("foreground", mode), tint)).toBeGreaterThanOrEqual(4.5);
        });

        it(`${mode} ${variant} alert: the icon on the tint over --${surface} (>= 3:1)`, () => {
          const tint = over(
            tokenColour(surface, mode),
            tokenColour(status.token, mode),
            alphaOf(status.alert, "bg-\\S+"),
          );
          expect(contrast(tokenColour(status.textToken, mode), tint)).toBeGreaterThanOrEqual(3);
        });
      }
    }
  }

  it("reads the alpha from the class names (so the test follows the components)", () => {
    expect(alphaOf("border-success/30 bg-success/10", "bg-\\S+")).toBe(0.1);
    expect(alphaOf("bg-warning/20 text-x", "bg-\\S+")).toBe(0.2);
    expect(() => alphaOf("bg-success", "bg-\\S+")).toThrow();
  });
});
