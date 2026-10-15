---
"@azmr/ui": minor
---

Add `Progress`, `Avatar`, `AvatarGroup` and `Chip`.

- `@azmr/ui/progress`: linear and circular, determinate and indeterminate (`value={null}`), with `min`/`max`, tones, `showValue` and a required accessible name. An indeterminate indicator is partial and pulses, and keeps pulsing under reduced motion (a still full bar would read as complete). Tone colours are tested for 3:1 against the track and the page in both themes; the `warning` tone uses `--warning-text`.
- `@azmr/ui/avatar`: an image with initials as the fallback when it is missing or fails to load, sizes and shapes, a required name, `alt` or `decorative`, `getInitials` (whole characters, never half a surrogate pair), and `AvatarGroup` with a labelled `+N` overflow.
- `Chip` (in `@azmr/ui/display`, a Server Component): a removable Badge with an accessible remove button.
