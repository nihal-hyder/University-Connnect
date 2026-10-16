/**
 * Maps database / API errors to messages that are safe to show to users.
 * Business-rule errors raised by our SQL functions carry curated messages
 * (SQLSTATE P0001, P0002, 22023, 42501, P0429). Anything else is replaced by a
 * generic message so internal details are never leaked.
 */
type MaybePgError = { code?: string; message?: string } | null | undefined;

const CURATED_CODES = new Set(["P0001", "P0002", "22023", "42501", "P0429"]);

export function userMessage(error: MaybePgError, fallback = "Something went wrong. Please try again."): string {
  if (!error) return fallback;
  if (error.code && CURATED_CODES.has(error.code) && error.message) {
    if (error.code === "42501" && /row-level security|permission denied for/i.test(error.message)) {
      return "You do not have permission to do that.";
    }
    return error.message;
  }
  switch (error.code) {
    case "23505":
      return "That already exists.";
    case "23503":
      return "This item is linked to other records and cannot be changed that way.";
    case "23514":
      return "Some values are not valid. Please check the form.";
    case "42501":
      return "You do not have permission to do that.";
    case "PGRST116":
      return "Not found.";
    default:
      return fallback;
  }
}

export type FieldErrors = Record<string, string[] | undefined>;

export type ActionResult<T = void> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export function ok<T>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

export function fail(error: string, fieldErrors?: FieldErrors): { ok: false; error: string; fieldErrors?: FieldErrors } {
  return { ok: false, error, fieldErrors };
}
