// @vitest-environment node
import { describe, expect, it } from "vitest";
import { expectServerSafe } from "../../test-utils/ssr.js";
import { toast } from "./toast.js";
import { Toaster } from "./toaster.js";

describe("toast on the server", () => {
  it("renders the Toaster without browser globals, and no markup: the stack mounts on the client", () => {
    // No toast can exist on the server, and the portal only renders in the browser, so the server
    // output has nothing to hydrate against and cannot mismatch.
    expect(expectServerSafe(<Toaster />)).not.toContain("data-toast");
  });

  it("calling toast() outside the browser does not throw", () => {
    expect(() => toast("From the server")).not.toThrow();
    expect(() => toast.dismiss()).not.toThrow();
  });
});
