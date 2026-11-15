# Theme studio: brand settings for business admins (PAZM-138)

Status: draft for approval, 15 Nov 2026. Phase 2 of the theme schema ([2026-11-13-theme-schema-design.md](2026-11-13-theme-schema-design.md), section 6).

## 1. Intent

A business admin should be able to set up their company's branding in an app built on `@azmr/ui` without a developer: the app name, a brand colour for light mode and for dark mode, and a logo. They see the result in a live preview before they save, and they cannot save a theme with unreadable text.

`@azmr/ui` ships this as a ready-made screen, so each host app (the Azmara portal first, others later) drops it in instead of building its own. The package produces a validated theme. The host app stores it.

The owner's description of success: an admin can update the look of their version of the app easily, with app theming that works in light and dark, plus the corporate logo.

## 2. Goals, non-goals, anti-goals

### Goals

- G1. An admin sets name, light brand colour, dark brand colour and logos on one screen (layout A in section 5), on a phone as well as a desktop.
- G2. The preview shows the result in light and dark, with a toggle, without changing the page the admin is working on.
- G3. The screen returns a `ThemeConfig` that passes `parseThemeConfig` and `validateTheme`. A theme that fails the contrast rules cannot be saved, and the admin is told why in plain language.
- G4. The package gets a reusable colour input (it has none today) and a reusable logo upload.
- G5. Accessible by default: keyboard only, screen reader, WCAG 2.2 AA, 44px touch targets, in both modes.

### Non-goals

- Saving, loading, per-organisation storage, who may edit, and applying the theme to the host app's layout. That is the host app's job (APP-34 in the Azmara portal).
- Editing the advanced settings (secondary, success, warning, info and destructive colours, surface tint, corner radius, font, density, per-role overrides). They stay in the schema for developers and are not shown.
- Choosing the colour mode. Light, dark or system stays each person's own preference (cookie); the theme has no mode setting.
- SVG logos, remote image fetching, or any image editing beyond shrinking to fit.
- A multi-step wizard (layout B was shown and rejected).

### Anti-goals (a failure even if it technically works)

- Saving drops settings it does not show. A developer may have set `radius`, `font`, `density`, `tint` or role overrides; submitting the studio must carry them through unchanged.
- An admin saves a theme that is unreadable in either mode.
- The studio restyles the live page while the admin is still editing.
- A logo that looks fine in the preview but is refused by the server because it is too big.
- Any client name, colour or data in this public repo. Examples use made-up companies.

## 3. Decisions made by the owner

- Fields shown: app name, brand colour, logo. The admin picks one brand colour per mode. One brand colour per mode is enough; they do not pick backgrounds or other roles.
- Advanced settings are hidden.
- The logo is uploaded as a file (not a pasted link).
- Layout A: one page, name and colours and logos on the left, preview beside it on a desktop and below it on a phone, a Light/Dark toggle on the preview.
- Plain-language note under each colour when it needs a darker or lighter shade to stay readable as text.
- The dark brand colour needs a small library change first: a new `brandDark` setting in the theme, so the dark colour is derived and contrast-adjusted exactly like the light one (decided 15 Nov 2026, after the builder check). The alternative, hand-setting about seven dark overrides from the studio, was rejected.
- Ships as a ready-made component in `@azmr/ui`, including the colour input and the logo upload.
- The owner approved an interactive mockup of this screen (a made-up company, kept out of the repo). It is a picture of the intent, not code to port: its contrast maths was a simple stand-in, and its 200 KB logo limit was wrong (see section 4).

## 4. Constraints from what already exists

Checked in the repo on 15 Nov 2026.

- **Schema.** `ThemeConfigSchema` (`@azmr/ui/theme-schema`, needs the optional `zod` peer) and `parseThemeConfig`, `parseThemeJson`, `validateTheme`, `createTheme` (`@azmr/ui/theme`, server-safe, no dependencies). Every value that reaches CSS is parsed; no free-text CSS.
- **Logo limits.** A logo is an `https:` URL or a PNG, JPEG or WebP data URI. A data URI may be at most `MAX_DATA_URI_CHARS` = 32,768 characters, which is roughly 24 KB of image after base64. The whole theme JSON may be at most `MAX_THEME_JSON_CHARS` = 131,072. SVG is refused. Phone photos and typical logo exports are far bigger than 24 KB, so the upload must shrink and re-encode in the browser, and say clearly when it cannot make a file fit.
- **Name.** `branding.appName` is 1 to 80 characters, no control characters, rendered as text.
- **Why a dark brand colour needs a library change.** Today every role is derived from one brand colour, and a `dark` override replaces a single role. Giving dark mode its own brand colour through overrides would mean about seven hand-set roles (`primary`, `primary-foreground`, `primary-text`, `ring`, `sidebar-primary`, `sidebar-primary-foreground`, `sidebar-ring`). Any `dark` key also turns on contrast enforcement, and the derived dark label is near-black, so a deliberately dark colour such as navy would be refused instead of adjusted. And on reopening, the studio could not tell its own overrides from a developer's.
- **Where each admin choice lands in `ThemeConfig`:**
  - app name: `branding.appName`
  - light brand colour: `brand`
  - dark brand colour (optional): a new `brandDark`. When it is set, it replaces `brand` for the dark half of every brand-derived role; when empty, dark is derived from `brand` as it is now.
  - logo: `branding.logo`; dark-mode logo (optional): `branding.logoDark`
- **`brandDark` is additive** (my call): an optional field, so `version` stays 1 and existing stored themes keep working. It must be added to `ThemeConfig`, `parseThemeConfig`, `ThemeConfigSchema` (with a label and help text), `createTheme`, the golden tests and the theming guide, and it needs a `brand` or `primary` to exist alongside it (as `tint` does). Which roles follow it is the builder's call, with the rule above as the starting point.
- **Mode and `light-dark()`.** Theme variables are `light-dark()` values, which only resolve if `color-scheme` is set on an ancestor. The preview container must set `color-scheme` itself from the toggle. (The Azmara portal hit this: setting only the `.dark` class is not enough.)
- **Preview.** Use the `cssVariables` from `createTheme` on the preview container only. Repo rules: no `dangerouslySetInnerHTML` and no raw colours in components (`CONVENTIONS.md`), so apply `cssVariables` through the `style` prop rather than injecting a `<style>` string.
- **Entries.** Client and server entries are kept apart (`CONVENTIONS.md`, "Entry kinds"). The studio is a client component and needs `zod` (via `@azmr/ui/rhf` and `fieldsFromSchema`), so it should not widen the dependency-free `@azmr/ui/theme` entry.
- **Existing building blocks.** `Input`, `Field`, `Form`, `Button`, `@azmr/ui/rhf` (`Form`, `FormField`), `fieldsFromSchema` in `components/zod`. There is no colour input and no file upload component.
- **Release process.** Releases go through the bot-opened release PR and npm publish; each feature PR carries its own changelog entry and docs.

## 5. Design

### 5.1 The screen (layout A)

One page.

- Left (desktop) or top (phone): the form.
  - App name (text).
  - Two boxes, "Light mode" and "Dark mode". Each has a brand colour (colour input) and a logo upload. The dark box's colour and logo are optional and say what happens when left empty ("uses your light mode colour, adjusted for dark").
  - A "Save branding" button and a "Reset" button.
- Right (desktop) or below (phone): "Preview" with a Light/Dark toggle. The preview is a small made-up app frame (header with logo and name, a card, a link, a badge, a primary button) coloured only by the admin's values, in the chosen mode.
- Under each colour: a one-line status. "Readable" when the colour is used as it is; otherwise a plain sentence that the colour is adjusted slightly where needed so buttons and text stay readable, naming the shade used for links and labels (for example "Links and labels use #xxxxxx"). The library adjusts button colours too, so the copy must not promise that buttons keep the exact colour. The shade quoted must come from the library's own derivation (`createTheme` output, including the `primary-text` role), not a second implementation, and the preview shows the adjusted result.
- Errors are plain sentences and name the field. Use New Zealand spelling in copy ("colour").

### 5.2 Components

All exported from `@azmr/ui`, each with its own tests, docs and changelog entry. Names and props are the builder's call, subject to the constraints above.

1. **Colour input.** A text field that takes a hex colour, with a swatch button that opens the browser's native colour picker, usable inside `Field` and `@azmr/ui/rhf`. Shows invalid state with a message. Generic, not theme-specific.
2. **Logo upload.** Choose or drop a PNG, JPEG or WebP; decode it to check it is really an image (do not trust the extension or MIME type); shrink and re-encode in the browser so the data URI fits 32,768 characters; show the result; allow remove and replace; report clearly if it cannot be made to fit. Never reads SVG and never fetches a URL.
3. **Theme studio.** The screen in 5.1. Takes the current `ThemeConfig` (or none) and calls back with a new, validated `ThemeConfig`. Preserves any keys it does not show. Does not save or fetch.

### 5.3 Behaviour

- Valid input updates the preview straight away. Invalid input (not a colour, an unreadable result) keeps the last good preview and shows the message next to the field.
- Save is available only when `parseThemeConfig` and `validateTheme` return nothing. With `brandDark`, a colour the admin picks is adjusted rather than refused, so the admin's own colours should never block a save. A block can still come from settings the admin cannot see: a developer's role overrides or tint, carried through unchanged, may conflict with the new colour, or the incoming theme may already fail. In that case Save stays disabled and the studio says, in plain words, that a setting made by a developer conflicts with this change and needs their attention, naming the role and showing the library's issue text for the developer. It never drops or edits the hidden setting to get past the check (my call).
- Empty optional fields are removed from the output, not saved as empty strings.
- Reset returns to the value the studio was given.

### 5.4 Docs and examples

A docs page on the platform site (`apps/site`) with a live studio, a short "wire it into your app" guide (store the returned JSON, validate it again on the server with `parseThemeJson` and `validateTheme`, render it in your layout), and a note on what the studio deliberately leaves out. The theming guide links to it. Examples use a made-up company.

## 6. Delivery

Small PRs, each merged when CI is green and the review is clean (the repo's quality loop):

0. `brandDark` in the theme (schema, `createTheme`, golden tests, theming guide, changelog).
1. Colour input.
2. Logo upload.
3. Theme studio, docs page, changelog.

Each is TDD, with unit, SSR and axe tests in light and dark. The studio PR includes tests that a theme with advanced fields survives a round trip untouched, that an unreadable colour cannot be saved, and that a logo which would not fit is reported.

APP-34 (separate, in the portal repo) then stores the result per organisation and applies it. It is not part of this work.

## 7. Success

- A first-time admin sets name, both colours and a logo on a phone in about two minutes without help (checked by hand on the docs example).
- The output always passes `parseThemeConfig` and `validateTheme`, and a developer's advanced settings survive a save.
- Passes axe in light and dark, and works with keyboard only.
- No new dependency in the dependency-free `@azmr/ui/theme` entry.

## 8. Left to the builder

- Component names, props and file layout; whether the studio is one entry or part of an existing one (subject to section 4).
- The resizing method for logos, and the longest side to shrink to.
- Whether the studio's strings go through the package's locale messages (follow whatever existing components do).
- Test layout, as long as it covers section 6.

## 9. My calls (for you to check)

- `brandDark` being an additive field with `version` staying 1.
- The block-and-explain behaviour when a hidden developer setting conflicts (section 5.3).
- The status line wording: it says colours are adjusted where needed, not that buttons keep your exact colour.
- The dark box's colour and logo being optional.
- Four small PRs rather than one.
- The logo upload shrinking files automatically instead of just rejecting big ones.
- The studio keeping unseen settings instead of replacing them.
