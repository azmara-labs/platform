// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/ssr.js";
import { Pagination } from "./pagination.js";

describe("Pagination renders on the server", () => {
  it("renders complete link markup with no browser globals", () => {
    const html = expectServerSafe(
      <Pagination page={5} pageCount={20} hrefFor={(p) => `/items?page=${p}`} />,
    );
    expect(html).toContain('aria-label="Pagination"');
    expect(html).toContain('href="/items?page=6"');
    expect(html).toContain('aria-current="page"');
  });
});
