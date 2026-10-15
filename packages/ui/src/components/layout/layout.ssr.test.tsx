// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/ssr.js";
import { AspectRatio } from "./aspect-ratio.js";
import { Container } from "./container.js";
import { Grid, GridItem } from "./grid.js";
import { Separator } from "./separator.js";
import { Stack } from "./stack.js";

describe("layout components server-render without browser globals", () => {
  it("renders a composed page layout", () => {
    const html = expectServerSafe(
      <Container as="main" size="lg">
        <Stack gap={4} direction={{ base: "column", md: "row" }} divider={<Separator />}>
          <Grid cols={{ base: 1, md: 3 }} minItemWidth="12rem">
            <GridItem span={{ base: 12, md: 4 }}>One</GridItem>
          </Grid>
          <AspectRatio ratio={2}>Media</AspectRatio>
        </Stack>
      </Container>,
    );
    expect(html).toContain("<main");
    expect(html).toContain("md:flex-row");
    expect(html).toContain("--azmr-grid-min:12rem");
    expect(html).toContain("md:col-span-4");
    expect(html).toContain("--azmr-ratio:2");
    expect(html).toContain("<hr");
  });
});
