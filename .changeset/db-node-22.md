---
"@azmr/db": minor
---

Requires Node.js 22 or later, up from 18, because better-sqlite3 (its SQLite driver) is now on 13.

better-sqlite3 13 runs on Node's stable N-API, so its prebuilt binaries ship inside the package and work across Node versions without a rebuild. It needs Node 22+. Node 18 and 20 are past end of life, so this is a minor release rather than a major one. If you are still on Node 20, stay on `@azmr/db` 1.1.x until you upgrade Node.
