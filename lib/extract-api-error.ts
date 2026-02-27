import axios from "axios";

/**
 * Extracts a user-friendly error message from an Axios error (or any unknown error).
 *
 * The backend (creative_hub) returns errors in the shape:
 *   { status: false, code: 4xx/5xx, message: "..." }
 * or sometimes the legacy shape:
 *   { detail: "..." }  |  { error: "..." }
 *
 * Priority order:
 *   1. data.message  (DRF custom_exception_handler / creative_hub global handler)
 *   2. data.detail   (DRF default)
 *   3. data.error    (legacy views)
 *   4. HTTP status code heuristics (429, 402, 403, 401)
 *   5. error.message (JavaScript Error)
 *   6. fallback string provided by the caller
 */
export function extractApiError(
  error: unknown,
  fallback = "An unexpected error occurred. Please try again."
): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (data) {
      // Primary: backend custom_exception_handler returns { message: "..." }
      if (data.message) {
        if (typeof data.message === "string") return data.message;
        // DRF non-field ValidationError wraps the string in a list: ["msg"]
        if (Array.isArray(data.message) && data.message.length > 0)
          return String(data.message[0]);
        // Validation errors may return { message: { field: ["..."] } }
        if (typeof data.message === "object") {
          const firstField = Object.values(
            data.message as Record<string, unknown>
          )[0];
          if (Array.isArray(firstField) && firstField.length > 0)
            return String(firstField[0]);
          return JSON.stringify(data.message);
        }
      }

      // Secondary: DRF default detail
      if (data.detail) return String(data.detail);

      // Tertiary: legacy { error: "..." }
      if (data.error) return String(data.error);
    }

    // HTTP status code fallbacks
    const status = error.response?.status;
    if (status === 429) return "Too many requests. Please slow down and try again.";
    if (status === 402) return "Insufficient credits. Please top up your account to continue.";
    if (status === 403) return "You don't have permission to perform this action.";
    if (status === 401) return "Your session has expired. Please log in again.";
    if (status === 503 || status === 502)
      return "The server is temporarily unavailable. Please try again shortly.";
  }

  if (error instanceof Error && error.message) return error.message;

  return fallback;
}
