import type { Filter } from "@azmr/db";
import { assertSafeIdentifier } from "@azmr/security";

/**
 * Structural subset of supabase-js's PostgrestFilterBuilder chain methods
 * that `applyFilter` needs. Exported for reference/documentation — the
 * implementation below does not type-check against it directly (see the
 * comment on `applyFilter`).
 */
export interface PostgrestFilterBuilderLike<Self> {
  eq(column: string, value: unknown): Self;
  neq(column: string, value: unknown): Self;
  gt(column: string, value: unknown): Self;
  gte(column: string, value: unknown): Self;
  lt(column: string, value: unknown): Self;
  lte(column: string, value: unknown): Self;
  like(column: string, pattern: string): Self;
  ilike(column: string, pattern: string): Self;
  is(column: string, value: boolean | null): Self;
  in(column: string, values: unknown[]): Self;
}

/**
 * Applies a Filter to a PostgREST query builder as chained, AND-combined
 * conditions.
 *
 * Typed loosely (query/return as `any`) rather than threading a generic
 * through supabase-js's own deeply-recursive PostgrestFilterBuilder types —
 * this package deliberately has no generated `Database` schema (see README:
 * "bring-your-own-schema"), and a self-referential generic constraint here
 * (`Q extends PostgrestFilterBuilderLike<Q>`) trips TypeScript's "Type
 * instantiation is excessively deep" check against the real supabase-js
 * type. Every call site already destructures `{ data, error }` and casts
 * the result explicitly, so nothing downstream depends on this function's
 * return type being precise.
 */
// biome-ignore lint/suspicious/noExplicitAny: see doc comment above
export function applyFilter(query: any, filter: Filter): any {
  let result = query;

  for (const { column, operator, value } of filter) {
    assertSafeIdentifier(column, "column name");

    switch (operator) {
      case "eq":
        result = result.eq(column, value);
        break;
      case "neq":
        result = result.neq(column, value);
        break;
      case "gt":
        result = result.gt(column, value);
        break;
      case "gte":
        result = result.gte(column, value);
        break;
      case "lt":
        result = result.lt(column, value);
        break;
      case "lte":
        result = result.lte(column, value);
        break;
      case "like":
        result = result.like(column, value as string);
        break;
      case "ilike":
        result = result.ilike(column, value as string);
        break;
      case "is":
        result = result.is(column, value as boolean | null);
        break;
      case "in":
        result = result.in(column, value as unknown[]);
        break;
    }
  }

  return result;
}
