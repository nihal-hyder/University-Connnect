import { publicEnv } from "@/lib/env/public";

/**
 * CSRF guard for plain route handlers that change state (server actions are
 * already protected by Next.js). Requires the Origin header to match the app.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const allowed = new Set([new URL(publicEnv.siteUrl).origin, new URL(request.url).origin]);
  return allowed.has(origin);
}
