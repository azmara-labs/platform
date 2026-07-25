import { DbAdapterError } from "@azmr/db";
import type { PostgrestError } from "@supabase/supabase-js";

/** Wraps a PostgREST error into a DbAdapterError, preserving code/details/hint and the original error as `cause`. */
export function toDbAdapterError(op: string, table: string, err: PostgrestError): DbAdapterError {
  return new DbAdapterError(`[azmara/db-supabase] ${op}("${table}") failed: ${err.message}`, {
    code: err.code,
    details: err.details,
    hint: err.hint,
    cause: err,
  });
}
