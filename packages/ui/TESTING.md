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

## Consumer fixture (`pnpm --filter @azmr/ui verify:consumer`)

Unit tests cannot prove that a published package works in a real app. `scripts/verify-consumer.mjs` packs `@azmr/core` and `@azmr/ui` into the same tarballs `npm publish` would ship, installs them into a fresh Next.js 16 + Tailwind v4 app outside the workspace (`fixtures/next-app`), builds it, serves it and checks:

- **Server Components** import the server-safe entries (`lib`, `theme`) and render the client components; the build fails if a `"use client"` directive is missing where it matters.
- **The class lists reach Tailwind** (`@azmr/ui/classes.css` and `@azmr/ui/classes/button.css` in the fixture's CSS): classes that exist only inside `dist` must appear in the app's CSS.
- **Server-rendered theme**: `data-theme` / `data-density` come from cookies on the first byte, and hostile cookie values are ignored, not reflected.
- The **exports map** resolves from a real install, including `@azmr/core` as a peer.
- **Two copies of `@azmr/core`** are a real type error: `Signal` has private members, so a second copy (different version; TypeScript unifies identical `name@version`) makes `useSignal(signal)` fail to type-check. A positive control (one copy passes) proves the failure comes from the duplicate. The `peerDependency` is what prevents it.

The checks are themselves tested: `--sabotage=no-source` strips the class-list imports from the app's CSS and `--sabotage=no-client-directive` strips `"use client"` from `react.js`; each run must fail where expected (exit 0) or the script reports the fault as undetected (exit 1). `--keep` leaves the work directory for inspection. Next lowers `light-dark()` to `--lightningcss-*` toggles for its browser targets; the check accepts either form.

## Registry fixture (`pnpm --filter @azmr/ui verify:registry`)

The shadcn-compatible registry (`registry/items.json`, built by `scripts/build-registry.mjs`) is checked the way a consumer uses it. `scripts/verify-registry.mjs` builds the registry, serves it over local HTTP at `/r/{name}.json`, copies a standard shadcn-style Next.js + Tailwind v4 app (`fixtures/registry-app`, with no `@azmr/ui` dependency), runs the real `shadcn add @azmr/button`, then checks the copied files (no relative imports, the app's own `@/` aliases), the dependencies added to `package.json`, what the `tokens` item wrote to `globals.css` (density, motion and colours added, the app's palette untouched, no self-referencing `--x: var(--x)` variables), and that the app builds and serves a styled Button. The CLI is pinned as a devDependency (`shadcn`), so the check is reproducible. The registry source is generated from the package source: `registry-transform.mjs` rewrites import specifiers only and fails on any relative import without a mapping, and `registry-tokens.mjs` derives the `tokens` item from `tokens.css`.
