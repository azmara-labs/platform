import { afterEach, describe, expect, it, vi } from "vitest";
import { renderUi } from "../../test-utils/index.js";

// Which feature set `features` picks cannot be seen in the DOM (both render the same markup), so
// the two feature modules are replaced with markers and the test records which one gets loaded.
const loaded = vi.hoisted(() => [] as string[]);

vi.mock("./features-dom.js", () => {
  loaded.push("dom");
  return { default: {} };
});
vi.mock("./features-max.js", () => {
  loaded.push("max");
  return { default: {} };
});

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

afterEach(() => {
  loaded.length = 0;
  vi.resetModules();
});

async function renderWith(features?: "dom" | "max") {
  const { MotionProvider, m } = await import("./index.js");
  renderUi(
    <MotionProvider features={features}>
      <m.div animate={{ opacity: 1 }}>x</m.div>
    </MotionProvider>,
  );
  await wait(100);
}

describe("MotionProvider features", () => {
  it("loads only the small feature set by default", async () => {
    await renderWith();
    expect(loaded).toEqual(["dom"]);
  });

  it('loads only the larger feature set for features="max"', async () => {
    await renderWith("max");
    expect(loaded).toEqual(["max"]);
  });
});
