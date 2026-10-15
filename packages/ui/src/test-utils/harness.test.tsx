import { useEffect, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations, findA11yViolations } from "./a11y.js";
import { prefersReducedMotion, reducedMotionQuery, withReducedMotion } from "./motion.js";
import { renderUi } from "./render.js";
import { setupUser } from "./user.js";

describe("renderUi", () => {
  it("renders into the document and exposes the container", () => {
    const { container } = renderUi(<p>hello</p>);
    expect(document.body.contains(container)).toBe(true);
    expect(container.textContent).toBe("hello");
  });

  it("rerender replaces the tree and unmount empties it", () => {
    const { container, rerender, unmount } = renderUi(<p>one</p>);
    rerender(<p>two</p>);
    expect(container.textContent).toBe("two");
    unmount();
    expect(container.textContent).toBe("");
  });

  it("flushes effects and the state updates they cause before returning", () => {
    function Effectful() {
      const [text, setText] = useState("before");
      useEffect(() => setText("after"), []);
      return <p>{text}</p>;
    }
    const { container } = renderUi(<Effectful />);
    expect(container.textContent).toBe("after");
  });
});

describe("renderUi cleanup between tests (part 1: leaves a node behind)", () => {
  it("mounts something", () => {
    renderUi(<span data-testid="leak-probe">x</span>);
    expect(document.querySelectorAll('[data-testid="leak-probe"]').length).toBe(1);
  });
});

describe("renderUi cleanup between tests (part 2: sees a clean document)", () => {
  it("removed what the previous test mounted", () => {
    expect(document.querySelectorAll('[data-testid="leak-probe"]').length).toBe(0);
  });
});

describe("expectNoA11yViolations", () => {
  it("passes accessible markup", async () => {
    const { container } = renderUi(
      <main>
        <h1>Title</h1>
        <label htmlFor="n">Name</label>
        <input id="n" />
        <button type="button">Save</button>
      </main>,
    );
    await expectNoA11yViolations(container);
  });

  it("fails an image without alt text, naming the rule", async () => {
    // biome-ignore lint/a11y/useAltText: deliberately inaccessible, to prove the helper fails on it
    const { container } = renderUi(<img src="/x.png" />);
    await expect(expectNoA11yViolations(container)).rejects.toThrow(/image-alt/);
  });

  it("fails a button with no accessible name", async () => {
    const { container } = renderUi(<button type="button" />);
    await expect(expectNoA11yViolations(container)).rejects.toThrow(/button-name/);
  });

  it("fails an input with no label", async () => {
    const { container } = renderUi(<input />);
    const violations = await findA11yViolations(container);
    expect(violations.map((v) => v.id)).toContain("label");
  });

  it("does not demand a landmark region for isolated component fragments", async () => {
    const { container } = renderUi(<p>just a fragment of text</p>);
    await expectNoA11yViolations(container);
  });
});

describe("withReducedMotion", () => {
  it("reports no preference by default", () => {
    expect(prefersReducedMotion()).toBe(false);
  });

  it("makes the reduced-motion media query match inside the callback only", () => {
    const seen = withReducedMotion(() => window.matchMedia(reducedMotionQuery).matches);
    expect(seen).toBe(true);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("restores matchMedia even when the callback throws", () => {
    expect(() =>
      withReducedMotion(() => {
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect(prefersReducedMotion()).toBe(false);
  });

  it("supports async callbacks and restores afterwards", async () => {
    const inside = await withReducedMotion(async () => {
      await Promise.resolve();
      return prefersReducedMotion();
    });
    expect(inside).toBe(true);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("does not claim other media queries match", () => {
    withReducedMotion(() => {
      expect(window.matchMedia("(min-width: 100000px)").matches).toBe(false);
    });
  });

  it("notifies listeners on the stubbed MediaQueryList without throwing", () => {
    withReducedMotion(() => {
      const mql = window.matchMedia(reducedMotionQuery);
      const handler = vi.fn();
      mql.addEventListener("change", handler);
      mql.removeEventListener("change", handler);
    });
  });
});

describe("setupUser", () => {
  it("types into an input and presses buttons like a real user", async () => {
    const user = setupUser();
    let clicks = 0;
    const { container } = renderUi(
      <div>
        <input aria-label="name" />
        <button type="button" onClick={() => clicks++}>
          go
        </button>
      </div>,
    );
    const input = container.querySelector("input") as HTMLInputElement;
    await user.type(input, "Aroha");
    expect(input.value).toBe("Aroha");
    await user.click(container.querySelector("button") as HTMLButtonElement);
    expect(clicks).toBe(1);
  });

  it("supports keyboard navigation with Tab", async () => {
    const user = setupUser();
    const { container } = renderUi(
      <div>
        <button type="button">a</button>
        <button type="button">b</button>
      </div>,
    );
    const [a, b] = Array.from(container.querySelectorAll("button"));
    await user.tab();
    expect(document.activeElement).toBe(a);
    await user.tab();
    expect(document.activeElement).toBe(b);
  });
});
