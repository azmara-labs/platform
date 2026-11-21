// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseFormData } from "./index.js";

describe("parseFormData on the server", () => {
  it("runs with no browser globals", async () => {
    expect(typeof window).toBe("undefined");
    const data = new FormData();
    data.append("plan", "pro");
    const result = await parseFormData(z.object({ plan: z.enum(["free", "pro"]) }), data);
    expect(result).toEqual({ success: true, data: { plan: "pro" } });
  });

  it("imports nothing from react", () => {
    for (const file of ["../zod/parse-form-data.ts", "../shared/form-data.ts"]) {
      const source = readFileSync(join(import.meta.dirname, file), "utf8");
      expect(source, file).not.toMatch(/from\s+["']react["']/);
    }
  });
});
