// Server-safe entry (`@azmr/ui/effect`): no React, so a schema module can be shared with the server.
// `effect` is an optional peer dependency: import this entry only if you use Effect Schema.
export { effectSchemaResolver, type StandardIssue, toFormIssues } from "./resolver.js";
