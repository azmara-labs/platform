# @azmr/legal

Legal documents as data, plus a check that keeps them honest against the code that uses them.

Azmara's privacy policy lives here once. The portal and the website each render it and run the
drift check in their own tests, so neither can drift from the policy, or from the other.

```ts
import { findPolicyDrift } from "@azmr/legal";
import { azmaraPrivacyPolicy } from "@azmr/legal/azmara";

// In a site's test suite:
const problems = findPolicyDrift({
  document: azmaraPrivacyPolicy,
  site: "app",
  dependencies: pkg.dependencies,
  envExample: readFileSync(".env.local.example", "utf8"),
  serviceDependencies: ["@supabase/supabase-js", "stripe", "resend"],
  trackerPattern: /posthog|sentry|mixpanel|@vercel\/analytics/i,
});
expect(problems).toEqual([]);
```

## What's in it

- `findPolicyDrift`: a pure function over a site's `package.json` dependencies and env example.
  It reports a provider the policy names but the code no longer uses, a service the code uses that
  the policy doesn't name, and a tracker that would contradict the cookie statement.
- `@azmr/legal/azmara`: Azmara's privacy policy, as sections and a list of processors, each marked
  with the site (`app` or `website`) that uses it.

The text is a draft for review. It is not legal advice.
