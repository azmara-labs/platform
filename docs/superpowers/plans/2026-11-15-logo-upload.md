# `LogoUpload` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a generic logo upload to `@azmr/ui`: choose or drop a PNG, JPEG or WebP, check it really is an image, shrink and re-encode it in the browser so the data URI fits a character limit, preview it, and allow replace and remove.

**Architecture:** Two files with one job each. `shrink-image.ts` turns a `File` into a `data:` URI or throws a `ShrinkError` with a code; it sniffs the file's first bytes, decodes with `createImageBitmap`, and draws to a canvas at smaller and smaller sizes until the result fits. `logo-upload.tsx` is the control: a button and drop area, a preview, and a status line, controlled or not. The package returns a string; storing it is the host app's job.

**Tech Stack:** React 19, Tailwind v4 tokens, Vitest with jsdom (which has no canvas, so the browser primitives are stubbed in tests and checked once in a real browser at the end), Testing Library, axe.

**Spec:** `docs/superpowers/specs/2026-11-15-theme-studio-design.md` (section 5.2, item 2; section 8 leaves the resizing method and longest side to the builder). This is PR 2 of four.

## Global Constraints

- New entry `logo-upload`: `packages/ui/src/components/logo-upload/` (`index.ts`, `logo-upload.tsx`, `shrink-image.ts`). The `input` entry is at 12.52 kB of 14 kB and must not grow. A client component.
- Generic: nothing theme-specific, no import from `src/theme` in non-test code. The default limit is a literal `32_768` with a comment, and a test pins it to `MAX_DATA_URI_CHARS`.
- Accepts exactly PNG, JPEG and WebP, decided from the file's first bytes (PNG `89 50 4E 47 0D 0A 1A 0A`; JPEG `FF D8 FF`; WebP `RIFF` + 4 bytes + `WEBP`), never from the extension or `file.type`. Text that begins `<svg` or `<?xml` (after optional whitespace or a byte order mark) gets its own refusal, and is never parsed or rendered. Never fetches a URL.
- Input limits: a file over 10 MiB (`10 * 1024 * 1024` bytes) is refused before it is read; an image over 40 million pixels is refused after decoding, and its bitmap is closed.
- Output: a lower-case `data:image/webp;base64,...`, `data:image/png;base64,...` or `data:image/jpeg;base64,...` of at most `maxChars` characters, in the shape `isAssetRef` accepts. Never upscales. Keeps transparency (no flattening onto a background).
- Ladder: longest side tries `[512, 384, 256, 192, 128, 96, 64]` (each capped at the image's own longest side); at each side, `image/webp` at quality `[0.9, 0.8, 0.65, 0.5]`. A browser that cannot encode WebP returns PNG from `toDataURL`; accept whatever PNG, JPEG or WebP comes back and keep descending. If nothing fits, throw `cannot-fit`.
- Strings are props with these English defaults (New Zealand English), the way `PasswordInput` takes `toggleLabel`: `chooseLabel` "Choose a logo", `replaceLabel` "Replace logo", `removeLabel` "Remove logo", `dropLabel` "or drop an image here", `previewAlt` "Logo preview", `busyLabel` "Preparing your logo...", and `errors` (a partial map from code to text, below).
- Error codes and default text: `not-an-image` "That file is not a PNG, JPEG or WebP image."; `svg` "SVG logos cannot be used here. Export your logo as a PNG, JPEG or WebP."; `file-too-large` "That file is larger than 10 MB. Choose a smaller image."; `too-many-pixels` "That image is too large to open. Choose a smaller one."; `cannot-fit` "This logo cannot be made small enough. Try a simpler image."; `unsupported-browser` "This browser cannot prepare images. Try a current browser."
- Preview renders an `<img>` only for `data:image/(png|jpeg|webp);base64,` values and `https:` URLs; any other incoming value shows no preview but can still be removed.
- No raw colours (`CONVENTIONS.md`, `no-raw-colour`); controls at least the density control height; focus ring on every control; `prefers-reduced-motion` respected (no motion is added). No `dangerouslySetInnerHTML`.
- Conventional commits, no AI attribution lines, one commit per task. Branch `feat/PAZM-138-logo-upload` off `main`. Do not widen any size budget without saying so in the PR; read numbers from `pnpm --filter @azmr/ui size`.

## Review Focus

- A file named `logo.png` that is really SVG, HTML, text or GIF: refused with the right code, never read as SVG. (Task 1)
- A huge file or a tiny file that decodes to a huge image (a decompression bomb): refused, no hang, bitmap closed. (Task 1)
- A logo with transparency stays transparent; a 40 px logo is not upscaled. (Task 1)
- Choosing a second file while the first is still being prepared, removing during preparation, or unmounting during it: the latest choice wins and a stale result is never applied. (Task 2)
- Choosing the same file again after removing it: the change still fires (the input's value is cleared). (Task 2)
- Dropping several files, a non-file (text, a link), or dropping while disabled. (Task 2)

---

### Task 1: `shrinkImage`

**Files:**
- Create: `packages/ui/src/components/logo-upload/shrink-image.ts`
- Test: `packages/ui/src/components/logo-upload/shrink-image.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type ShrinkErrorCode =
    | "not-an-image" | "svg" | "file-too-large" | "too-many-pixels" | "cannot-fit" | "unsupported-browser";
  export class ShrinkError extends Error { readonly code: ShrinkErrorCode; constructor(code: ShrinkErrorCode); }
  export interface ShrinkResult { dataUri: string; width: number; height: number }
  export function sniffImageType(bytes: Uint8Array): "png" | "jpeg" | "webp" | "svg" | undefined;
  export function shrinkImage(file: Blob, maxChars: number): Promise<ShrinkResult>;
  ```

- [ ] **Step 1: Write the failing tests.** Build byte arrays by hand (`new Blob([Uint8Array.of(0x89, 0x50, ...)])`). jsdom has no `createImageBitmap` or canvas, so stub with `vi.stubGlobal("createImageBitmap", ...)` returning `{ width, height, close: vi.fn() }`, and `vi.spyOn(HTMLCanvasElement.prototype, "getContext")` returning `{ drawImage: vi.fn() }` and `vi.spyOn(HTMLCanvasElement.prototype, "toDataURL")` returning a fake URI whose length depends on `canvas.width` so the ladder can be driven. Tests, by name:
  - `"sniffImageType reads PNG, JPEG and WebP from their first bytes"`, `"sniffImageType returns svg for text starting <svg or <?xml, with leading whitespace or a BOM"`, `"sniffImageType returns undefined for GIF, PDF, HTML, empty and one-byte input"`.
  - `"refuses a file named .png whose bytes are SVG with code svg, and never decodes it"` (`createImageBitmap` not called).
  - `"refuses GIF bytes with code not-an-image"`; `"refuses an empty file"`.
  - `"refuses a file over 10 MiB with file-too-large before reading it"` (use an object with `size` over the limit and a `slice`/`arrayBuffer` that throws if called).
  - `"refuses an image over 40 million pixels with too-many-pixels and closes the bitmap"`.
  - `"throws unsupported-browser when createImageBitmap is missing"`; `"throws not-an-image when decoding rejects"` (valid PNG header, truncated body).
  - `"returns the first size that fits, descending 512, 384, ..."`: a 2000x1000 image, `toDataURL` result longer than `maxChars` until `canvas.width <= 256`; the result width is 256 and height 128 (aspect kept, rounded).
  - `"never upscales"`: a 40x30 image yields a 40x30 canvas.
  - `"tries lower qualities before a smaller size"`: at 512 the quality 0.9 result is too long and 0.8 fits; assert the sequence of `toDataURL` arguments.
  - `"throws cannot-fit when nothing fits"`.
  - `"accepts a PNG fallback when webp is not encoded"` (stub returns `data:image/png;base64,...`) and `"refuses an encoder result that is not png, jpeg or webp"` (continues, then `cannot-fit`).
  - `"the result matches the data URI shape the theme accepts"`: import `isAssetRef` and `MAX_DATA_URI_CHARS` from `../../theme/config.js` in this test only, and assert `isAssetRef(result.dataUri)` and the default constant equals `32_768`.
  - `"closes the bitmap on success and on failure"`.

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm -F @azmr/ui exec vitest run src/components/logo-upload/shrink-image.test.ts`
Expected: FAIL, module `./shrink-image.js` does not exist.

- [ ] **Step 3: Implement** `shrink-image.ts` with the signatures above. Read only the first 16 bytes with `file.slice(0, 16).arrayBuffer()` to sniff. Draw with `canvas.getContext("2d")` and `drawImage(bitmap, 0, 0, w, h)` with `imageSmoothingQuality = "high"`; use `document.createElement("canvas")` (the function is only called in the browser). No dependency.

- [ ] **Step 4: Run to verify they pass**, then `pnpm -F @azmr/ui check-types`.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/components/logo-upload
git commit -m "feat: add shrinkImage for in-browser logo preparation (PAZM-138)"
```

### Task 2: `LogoUpload`

**Files:**
- Create: `packages/ui/src/components/logo-upload/logo-upload.tsx`, `packages/ui/src/components/logo-upload/index.ts`
- Test: `logo-upload.test.tsx`, `logo-upload.ssr.test.tsx` (first line `// @vitest-environment node`)

**Interfaces:**
- Consumes: `shrinkImage`, `ShrinkError` (Task 1); `cn`; `Button` from `../button/index.js`; `renderUi`, `setupUser`, `expectNoA11yViolations`, `expectServerSafe`; `Field` for the integration test.
- Produces:
  ```ts
  export interface LogoUploadProps {
    value?: string | null;             // controlled: a data URI or https URL, null or "" for none
    defaultValue?: string;
    onValueChange?: (value: string | undefined) => void;   // data URI after a good upload, undefined after Remove
    onError?: (code: ShrinkErrorCode | undefined) => void; // a refusal, or undefined when it clears
    maxChars?: number;                 // @default 32_768
    name?: string;                     // renders a hidden input carrying the value, for native forms
    disabled?: boolean;
    id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean; className?: string;
    chooseLabel?: string; replaceLabel?: string; removeLabel?: string; dropLabel?: string;
    previewAlt?: string; busyLabel?: string; errors?: Partial<Record<ShrinkErrorCode, string>>;
  }
  export const LogoUpload: ForwardRefExoticComponent<LogoUploadProps & RefAttributes<HTMLButtonElement>>;
  ```
  `ref` and `id` are the choose/replace button, so a `Field` label points at it. Markup: wrapper `data-slot="logo-upload"`, a visually hidden `<input type="file" accept="image/png,image/jpeg,image/webp" tabindex="-1">`, the button, a preview `<img>` when there is one, a Remove button when there is a value, a status `<p role="status">` (busy text and "Logo ready") and an error `<p role="alert" id=...>` joined to the button's `aria-describedby`.

- [ ] **Step 1: Write the failing tests.** Stub the browser primitives as in Task 1 through a small shared helper in `logo-upload/test-support.ts`. Choose a file with `user.upload(fileInput, file)` (the file input is found by `container.querySelector('input[type="file"]')`). Tests, by name:
  - `"shows Choose a logo and no preview when empty; Replace logo, a preview and Remove logo when it has a value"`.
  - `"a good file calls onValueChange once with the data URI and shows the preview"`; `"uncontrolled keeps the value; controlled shows the parent's value until the parent accepts it"`.
  - `"shows the busy text while preparing, then Logo ready"` (hold the stubbed decode on a promise).
  - `"a refused file calls onError with its code, shows that text with role alert, links it by aria-describedby, and leaves the old logo"` for `svg`, `not-an-image`, `cannot-fit`; `"a later good file clears the error and calls onError(undefined)"`; `"errors overrides the text"`.
  - `"Remove calls onValueChange(undefined), clears the error and moves focus to the choose button"`.
  - `"choosing the same file again after Remove still fires"` (the file input's value is cleared after each choice).
  - `"the latest choice wins: a slow first file never overwrites a second"`; `"removing while preparing drops the result"`; `"unmounting while preparing logs no state-update warning"` (spy on `console.error`).
  - Drop: `"dropping an image prepares it"` with `fireEvent.drop(zone, { dataTransfer: { files: [file], types: ["Files"] } })`; `"dropping several files uses the first"`; `"dropping text or a link does nothing"` (no `files`); `"dragging over sets data-dragging and leaving clears it"`; `"disabled ignores drops, and disables every button and the file input"`.
  - `"an https value previews; an unsupported value (javascript:, http:, data:image/svg+xml) shows no img but can be removed"`.
  - `"maxChars is passed to shrinkImage"` (assert the stubbed encoder's size check by passing `maxChars` of 2000 and a fake URI of 3000).
  - `"name renders a hidden input holding the value, and nothing without name"`.
  - `"Field labels the choose button and its error describes it"`; `"ref is the choose button"`.
  - Accessibility: `"has no axe violations"` empty, with a value, with an error, disabled; `"Tab goes choose button, then Remove; Enter and Space on the button open the file chooser"` (spy `HTMLInputElement.prototype.click`).
  - SSR: `"server-renders the empty and the filled control with no browser globals"` (`expectServerSafe`; html contains `type="file"` and, filled, the `<img`).

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm -F @azmr/ui exec vitest run src/components/logo-upload`
Expected: FAIL, `./logo-upload.js` does not exist (Task 1's tests still pass).

- [ ] **Step 3: Implement `LogoUpload`** with the signature above. Approach: a request counter in a ref (`const ticket = ++latest.current`; apply a result only if `ticket === latest.current` and still mounted) covers latest-wins, remove-during-busy and unmount. Controlled/uncontrolled as `Input` does (`value === undefined` means uncontrolled). Clear the file input's value after every choice. Drag handlers on the wrapper; ignore events whose `dataTransfer.types` lacks `"Files"`. Stay generic: no theme words in copy or names.

- [ ] **Step 4: Run to verify they pass**, then `pnpm -F @azmr/ui exec vitest run src/components/logo-upload src/conventions.test.ts && pnpm -F @azmr/ui check-types`.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/components/logo-upload
git commit -m "feat: add LogoUpload, a logo file picker that shrinks to fit (PAZM-138)"
```

### Task 3: Entry, docs, changeset, full check and a real-browser check

**Files:**
- Modify (follow `password-input`, the entry added most like this one): `packages/ui/build/entries.json` (`"logo-upload"` under `client`), `packages/ui/package.json` (`./logo-upload` export), `packages/ui/.size-limit.json` (an entry; set the limit from the measured size plus a small margin and say so in the PR), `packages/ui/src/index.ts` (export `LogoUpload`, `ShrinkError`, types), `packages/ui/README.md` (a row), `apps/site/content/docs/components/meta.json` (page order).
- Create: `apps/site/content/docs/components/logo-upload.mdx` (match `password-input.mdx` and the PAZM-126 component-page standard enforced by `component-pages.test.ts`), demo files under `apps/site/src/demos/logo-upload/` registered the way `password-input` demos are (`names.ts`, `lazy.tsx`, `registry.ts`), `.changeset/logo-upload.md` (minor, `@azmr/ui`).

**Interfaces:**
- Consumes: Tasks 1 and 2.

- [ ] **Step 1: Register the entry and write the docs and demo**, then run the site tests: `pnpm -F @azmr/site exec vitest run`. Expected first run: FAIL on whatever is missing (page sections, demo registration, props table). The page covers: what it does and does not do (it returns a string and stores nothing; no SVG; no URL fetching), the shrink ladder in one short paragraph, props, a `Field` example, the `FormField controlled` pattern with `@azmr/ui/rhf`, keyboard rows (`Tab`, `Enter` or `Space` on the button opens the chooser), the Accessibility list, and "When not to use it" (photos, anything that needs cropping or a server-side check). The demo uses a made-up company name and shows the character count against the limit.

- [ ] **Step 2: Make the site tests pass**, regenerating any generated files the repo's build produces (`apps/site/public/docs/...`, `llms*.txt`) the way earlier PRs did.

- [ ] **Step 3: Add the changeset** `.changeset/logo-upload.md`:
```md
---
"@azmr/ui": minor
---

Add `LogoUpload` (`@azmr/ui/logo-upload`): choose or drop a PNG, JPEG or WebP and get back a small `data:` URI. The file is checked from its first bytes, decoded, then shrunk and re-encoded in the browser until it fits `maxChars` (default 32,768, the theme's data URI limit). SVG is refused and nothing is fetched. It returns the string and stores nothing.
```

- [ ] **Step 4: Run everything**

Run: `pnpm build && pnpm test && pnpm check-types && pnpm lint && pnpm --filter @azmr/ui size`
Expected: all PASS, sizes within budget. Read the counts and sizes from the output for the PR body.

- [ ] **Step 5: Check in a real browser** (jsdom cannot draw). Start the docs site, open the `LogoUpload` demo, and upload: a 2000x2000 PNG with transparency, a 6000x4000 JPEG photo, an SVG renamed `logo.png`, a GIF renamed `logo.png`, and a 12 MB file. Expected: the first two give a preview and a data URI at most 32,768 characters that `isAssetRef` accepts, with transparency kept for the PNG; the last three show the matching message. Record what was seen in the PR body, with the browser and version. Never claim a browser result that was not observed.

- [ ] **Step 6: Commit**

```bash
git add apps/site packages/ui .changeset/logo-upload.md
git commit -m "docs: document LogoUpload and add the changeset (PAZM-138)"
```
