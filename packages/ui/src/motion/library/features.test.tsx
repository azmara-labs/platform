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

// The first import of the motion library is slow on a busy machine (the whole repository's tests run
// in parallel in the pre-push hook and in CI). Past the 5 s default the first test timed out, and
// its late load then leaked into the second one. The wait above is what the test is about; this
// only stops the cold import from failing it.
const SLOW_IMPORT_MS = 30_000;

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
  it(
    "loads only the small feature set by default",
    async () => {
      await renderWith();
      expect(loaded).toEqual(["dom"]);
    },
    SLOW_IMPORT_MS,
  );

  it(
    'loads only the larger feature set for features="max"',
    async () => {
      await renderWith("max");
      expect(loaded).toEqual(["max"]);
    },
    SLOW_IMPORT_MS,
  );
});
