// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/ssr.js";
import { AnimatedCheck } from "./animated-check.js";
import { Collapse } from "./collapse.js";
import { Stagger } from "./stagger.js";

describe("the presets render on the server", () => {
  it("Collapse renders complete markup", () => {
    const html = expectServerSafe(<Collapse open={false}>Body</Collapse>);
    expect(html).toContain('data-state="closed"');
    expect(html).toContain("inert");
  });

  it("Stagger renders each child with its index", () => {
    const html = expectServerSafe(
      <Stagger as="ul">
        <li>A</li>
        <li>B</li>
      </Stagger>,
    );
    expect(html).toContain("--stagger-index:0");
    expect(html).toContain("--stagger-index:1");
  });

  it("AnimatedCheck renders an svg", () => {
    expect(expectServerSafe(<AnimatedCheck />)).toContain("<svg");
  });
});
