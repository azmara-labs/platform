import { MotionConfigContext, motion } from "motion/react";
import { Component, type ReactNode, useContext } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type MatchMediaMock,
  mockMatchMedia,
  reducedMotionQuery,
  renderUi,
} from "../../test-utils/index.js";
import { AnimatePresence, MotionProvider, m, Reorder, springs } from "./index.js";

let mock: MatchMediaMock | undefined;
afterEach(() => {
  mock?.restore();
  mock = undefined;
});

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("@azmr/ui/motion: exports", () => {
  it("re-exports the lazy component, presence and reorder from motion", () => {
    expect(m.div).toBeDefined();
    expect(typeof AnimatePresence).toBe("function");
    expect(Reorder.Group).toBeDefined();
    expect(Reorder.Item).toBeDefined();
  });

  it("names three spring presets with the spring type", () => {
    expect(Object.keys(springs).sort()).toEqual(["bouncy", "gentle", "snappy"]);
    for (const spring of Object.values(springs)) {
      expect(spring.type).toBe("spring");
      expect(spring.stiffness).toBeGreaterThan(0);
      expect(spring.damping).toBeGreaterThan(0);
    }
    expect(springs.bouncy.damping).toBeLessThan(springs.snappy.damping);
    expect(springs.snappy.stiffness).toBeGreaterThan(springs.gentle.stiffness);
  });
});

describe("MotionProvider", () => {
  it("renders its children", () => {
    const { container } = renderUi(
      <MotionProvider>
        <p>Hello</p>
      </MotionProvider>,
    );
    expect(container.textContent).toBe("Hello");
  });

  it("asks motion to follow the system's reduced-motion setting", () => {
    let seen: unknown;
    function Probe() {
      seen = useContext(MotionConfigContext).reducedMotion;
      return null;
    }
    renderUi(
      <MotionProvider>
        <Probe />
      </MotionProvider>,
    );
    expect(seen).toBe("user");
  });

  describe("strict", () => {
    class Catch extends Component<{ children: ReactNode }, { error: string | null }> {
      override state = { error: null as string | null };
      static getDerivedStateFromError(error: Error) {
        return { error: error.message };
      }
      override render() {
        return this.state.error === null ? this.props.children : <p>{this.state.error}</p>;
      }
    }

    function renderFull(strict?: boolean) {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        return renderUi(
          <Catch>
            <MotionProvider strict={strict}>
              <motion.div>full</motion.div>
            </MotionProvider>
          </Catch>,
        ).container.textContent;
      } finally {
        spy.mockRestore();
      }
    }

    it("by default refuses the full `motion` component, so the whole library is not bundled by accident", () => {
      expect(renderFull()).toMatch(/LazyMotion|motion/i);
      expect(renderFull()).not.toBe("full");
    });

    it("lets the full `motion` component through when strict is switched off", () => {
      expect(renderFull(false)).toBe("full");
    });
  });

  it("loads the animation features on demand and then animates an `m` element", async () => {
    mock = mockMatchMedia({ [reducedMotionQuery]: false });
    const { container } = renderUi(
      <MotionProvider>
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.05 }}
          data-testid="box"
        />
      </MotionProvider>,
    );
    const box = container.querySelector("[data-testid=box]") as HTMLElement;
    expect(box.style.opacity).toBe("0");
    await vi.waitFor(() => expect(Number(box.style.opacity)).toBe(1), { timeout: 3000 });
  });

  it("under reduced motion, movement is skipped while a fade still plays", async () => {
    mock = mockMatchMedia({ [reducedMotionQuery]: true });
    const { container } = renderUi(
      <MotionProvider>
        <m.div
          initial={{ x: 0, opacity: 0 }}
          animate={{ x: 100, opacity: 1 }}
          transition={{ duration: 0.3 }}
          data-testid="box"
        />
      </MotionProvider>,
    );
    const box = container.querySelector("[data-testid=box]") as HTMLElement;
    await vi.waitFor(() => expect(box.style.transform).toContain("100px"), { timeout: 3000 });
    // The movement landed at once, not over 300 ms.
    expect(box.style.transform).toContain("100px");
  });

  it("without reduced motion, the same movement takes its time", async () => {
    mock = mockMatchMedia({ [reducedMotionQuery]: false });
    const { container } = renderUi(
      <MotionProvider>
        <m.div
          initial={{ x: 0 }}
          animate={{ x: 100 }}
          transition={{ duration: 0.6, ease: "linear" }}
          data-testid="box"
        />
      </MotionProvider>,
    );
    const box = container.querySelector("[data-testid=box]") as HTMLElement;
    await wait(120);
    const x = Number(/translateX\((-?[\d.]+)px\)/.exec(box.style.transform || "")?.[1] ?? 0);
    expect(x).toBeLessThan(100);
  });

  it("can load the larger feature set for layout animation and drag", () => {
    const { container } = renderUi(
      <MotionProvider features="max">
        <p>Max</p>
      </MotionProvider>,
    );
    expect(container.textContent).toBe("Max");
  });

  it("renders a Reorder list inside the default (strict) provider, as the docs demo does", () => {
    // `strict` forbids the full `motion` component inside LazyMotion, so this fails loudly if
    // Reorder is built on it.
    const { container } = renderUi(
      <MotionProvider features="max">
        <Reorder.Group axis="y" values={["a", "b"]} onReorder={() => {}} aria-label="Items">
          <Reorder.Item value="a">First</Reorder.Item>
          <Reorder.Item value="b">Second</Reorder.Item>
        </Reorder.Group>
      </MotionProvider>,
    );
    const list = container.querySelector("ul");
    expect(list?.getAttribute("aria-label")).toBe("Items");
    expect(Array.from(container.querySelectorAll("li"), (li) => li.textContent)).toEqual([
      "First",
      "Second",
    ]);
  });
});
