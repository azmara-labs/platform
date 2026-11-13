---
"@azmr/ui": patch
---

Derive the colours `createTheme` makes (`primary`, `secondary`, status colours, warning text and focus rings) for the `background`, `card` and `popover` you override, and the sidebar ring for the `sidebar` you override. Before, they were always derived for the default surfaces, so a lighter dark mode, or a light mode with dark surfaces, could fail the contrast check on text the theme had derived. A mode whose surfaces are dark is derived the way a dark mode is. Output is unchanged when none of those roles is overridden.
