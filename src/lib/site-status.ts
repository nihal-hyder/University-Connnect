/** maintenance: in effect now. scheduledAt: a future start time, announced to visitors in advance. */
export type SiteStatus = { maintenance: boolean; message: string | null; scheduledAt: string | null; updatedAt: string | null };

export const DEFAULT_MAINTENANCE_MESSAGE = "We're making some improvements. The site will be live again soon.";

/** Parses the jsonb returned by public.get_site_status(). Anything unexpected means "online". */
export function parseSiteStatus(data: unknown): SiteStatus {
  const raw = (data ?? {}) as { maintenance?: unknown; message?: unknown; scheduled_at?: unknown; updated_at?: unknown };
  return {
    maintenance: raw.maintenance === true,
    message: typeof raw.message === "string" && raw.message.trim() ? raw.message.trim() : null,
    scheduledAt: typeof raw.scheduled_at === "string" ? raw.scheduled_at : null,
    updatedAt: typeof raw.updated_at === "string" ? raw.updated_at : null,
  };
}

/**
 * Paths that stay reachable while the site is in maintenance, so platform
 * administrators can still sign in and switch it off.
 */
const MAINTENANCE_OPEN_PREFIXES = ["/maintenance", "/login", "/auth", "/forgot-password", "/reset-password", "/offline", "/icons"];
const MAINTENANCE_OPEN_FILES = ["/manifest.webmanifest", "/sw.js", "/robots.txt", "/opengraph-image"];

export function isOpenDuringMaintenance(path: string): boolean {
  return MAINTENANCE_OPEN_FILES.includes(path) || MAINTENANCE_OPEN_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}
