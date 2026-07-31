---
"@azmr/query": patch
---

`QueryBuilder.first()` no longer permanently mutates the builder. Previously
`first()` called `this.limit(1)`, which set `_limitN = 1` on the instance
forever — so any later `.select()` on the same builder returned at most one
row, even without an explicit `.limit()` call. `select()` and `first()` now
share an internal helper that takes the limit as a parameter instead of
reading `this._limitN` directly, so `first()` can read one row without
touching builder state.

No public API change.
