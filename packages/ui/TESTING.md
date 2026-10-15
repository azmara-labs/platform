# Testing `@azmr/ui`

Every component goes through the same checks. The helpers live in `src/test-utils` (test-only, never published) and are cleaned up automatically after each test by `src/test-setup.ts`.

## The checklist (the "definition of done" for a component)

| Check | Helper | Notes |
|---|---|---|
| Behaviour | `renderUi`, `setupUser` | Render inside `act`; drive it like a user (typing, clicking, `Tab`, arrows, `Escape`). |
| Accessibility | `expectNoA11yViolations(container)` | axe-core. Colour contrast is covered by the token tests, because jsdom has no layout. |
| Keyboard map | `setupUser().keyboard(...)` | Test every key the component documents. |
| Reduced motion | `withReducedMotion(() => ...)` | Required for anything that animates. Restores `matchMedia` even if the test throws. |
| Server safety | `expectServerSafe(ui)` | Server-safe entries only. The test file must start with `// @vitest-environment node`. |
| Size | `pnpm --filter @azmr/ui size` | Budgets in `.size-limit.json` (JS) and `scripts/check-css-size.mjs` (CSS). CI fails when exceeded. |

## Example

```tsx
import { describe, expect, it } from "vitest";
import { expectNoA11yViolations, renderUi, setupUser, withReducedMotion } from "../test-utils/index.js";
import { Thing } from "./Thing.js";

describe("Thing", () => {
  it("is accessible", async () => {
    const { container } = renderUi(<Thing label="Save" />);
    await expectNoA11yViolations(container);
  });

  it("opens with the keyboard", async () => {
    const user = setupUser();
    const { container } = renderUi(<Thing label="Save" />);
    await user.tab();
    await user.keyboard("{Enter}");
    expect(container.querySelector("[data-open]")).not.toBeNull();
  });

  it("skips the transition under reduced motion", () => {
    withReducedMotion(() => {
      /* render and assert that no animation runs */
    });
  });
});
```

## Conventions

- Write the failing test first, and see it fail for the right reason.
- When a test guards a rule (a manifest rule, a token threshold, a budget), prove it fails by breaking the rule once.
- Tests that need real layout or a real browser (focus rings, scrolling, virtualisation) belong in Playwright component tests (added with the data grid).
