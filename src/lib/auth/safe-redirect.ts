/**
 * Returns a same-origin relative path, or the fallback. Prevents open
 * redirects such as ?next=https://evil.example or ?next=//evil.example.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || typeof next !== "string") return fallback;
  let value: string;
  try {
    value = decodeURIComponent(next).trim();
  } catch {
    return fallback;
  }
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  // Reject control characters (e.g. tabs/newlines browsers strip from URLs).
  for (const ch of value) {
    if (ch.charCodeAt(0) < 0x20 || ch.charCodeAt(0) === 0x7f) return fallback;
  }
  try {
    const parsed = new URL(value, "http://placeholder.local");
    if (parsed.origin !== "http://placeholder.local") return fallback;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return fallback;
  }
}
