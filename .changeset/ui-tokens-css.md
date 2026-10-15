---
"@azmr/ui": minor
---

Add `@azmr/ui/tokens.css`: the design tokens, themes, density, motion and Tailwind mapping without the global base rules. `styles.css` is now `tokens.css` plus those rules (the `body` colours and the default border and outline colour), so existing imports render exactly as before. Use `tokens.css` in an app that already has global styles, such as one migrating from another UI library, or a docs site.
