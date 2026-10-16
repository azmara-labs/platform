// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/ssr.js";
import { MotionProvider, m } from "./index.js";

describe("@azmr/ui/motion on the server", () => {
  it("renders the provider and an animated element with their initial state, without browser globals", () => {
    const html = expectServerSafe(
      <MotionProvider>
        <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          Content
        </m.div>
      </MotionProvider>,
    );
    expect(html).toContain("Content");
    expect(html).toContain("opacity:0");
  });
});
