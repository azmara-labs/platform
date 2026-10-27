---
"@azmr/ui": minor
---

Add `@azmr/ui/form`: `Fieldset` (legend, description and group error for grouped controls), `FormSection` (titled sections for long forms, with one or two columns and an optional heading-beside-fields layout that responds to the section's own width) and `ErrorSummary` (the GOV.UK error summary: after a failed submit it takes focus and lists each error as a link that moves focus to its field). `ErrorSummary` reads React Hook Form's `formState.errors`, Base UI Form's `errors` or a plain record, so it needs no `Controller`.
