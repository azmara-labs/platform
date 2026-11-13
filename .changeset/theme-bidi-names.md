---
"@azmr/ui": patch
---

Refuse bidirectional control characters (such as U+202E, which reverses the text after it) in a theme `name` and in `branding.appName`. Arabic, Hebrew and other right-to-left text is still accepted.
