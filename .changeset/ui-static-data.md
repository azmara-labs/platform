---
"@azmr/ui": minor
---

Add four server-safe components, each its own entry: `@azmr/ui/table` (a semantic `Table` with caption, header, footer, sticky header, striping, a named scroll region and `numeric` cells), `@azmr/ui/breadcrumb` (`Breadcrumb` parts and a data-driven `Breadcrumbs` with `maxItems` collapsing), `@azmr/ui/pagination` (`Pagination` as real links or buttons, plus the pure `getPageRange` the data grid can reuse) and `@azmr/ui/stepper` (a status `Stepper`, horizontal or vertical, with every state also said in text). `buttonVariants` now lives in a pure module so server components can use it.
