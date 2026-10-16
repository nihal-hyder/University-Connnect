import { z } from "zod";
import type { EventFilters } from "@/lib/data/events";

const uuid = z.string().uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const EVENT_TYPES = [
  "hackathon", "competition", "workshop", "seminar", "conference", "webinar", "festival",
  "debate", "mun", "sports", "cultural", "career_fair", "networking", "other",
] as const;

const schema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().regex(/^[a-z0-9-]{1,60}$/).optional(),
  type: z.enum(EVENT_TYPES).optional(),
  university: uuid.optional(),
  campus: uuid.optional(),
  society: uuid.optional(),
  city: z.coerce.number().int().positive().max(32000).optional(),
  format: z.enum(["in_person", "online", "hybrid"]).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  fee: z.enum(["free", "paid"]).optional(),
  open: z.literal("1").optional(),
  scope: z.enum(["open", "host_university", "selected_universities"]).optional(),
  mine: z.literal("1").optional(),
  volunteering: z.literal("1").optional(),
  sort: z.enum(["soonest", "newest", "deadline", "relevance"]).optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
});

export type ExploreParams = z.infer<typeof schema>;

/** Parse untrusted URL params; invalid individual values are dropped, not fatal. */
export function parseExploreParams(raw: Record<string, string | string[] | undefined>): ExploreParams {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const value = Array.isArray(v) ? v[0] : v;
    if (value !== undefined && value !== "") flat[k] = value;
  }
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(schema.shape) as (keyof typeof schema.shape)[]) {
    if (!(key in flat)) continue;
    const parsed = schema.shape[key].safeParse(flat[key]);
    if (parsed.success && parsed.data !== undefined) result[key] = parsed.data;
  }
  return result as ExploreParams;
}

export function toEventFilters(p: ExploreParams, viewerUniversity: string | null): EventFilters {
  return {
    q: p.q,
    category: p.category,
    type: p.type,
    university: p.university,
    campus: p.campus,
    society: p.society,
    city: p.city,
    format: p.format,
    from: p.from,
    to: p.to,
    free: p.fee === "free" ? true : p.fee === "paid" ? false : undefined,
    open: p.open === "1",
    scope: p.scope,
    eligibleFor: p.mine === "1" && viewerUniversity ? viewerUniversity : undefined,
    volunteering: p.volunteering === "1",
    sort: p.sort,
  };
}

/** Build a query string from params, dropping empty values and page by default. */
export function buildQuery(p: Partial<Record<keyof ExploreParams, string | number | undefined>>, overrides: Record<string, string | number | undefined> = {}) {
  const merged: Record<string, string | number | undefined> = { ...p, ...overrides };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined && v !== "" && !(k === "page" && Number(v) === 1)) sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function activeFilterCount(p: ExploreParams) {
  return (["category", "type", "university", "campus", "society", "city", "format", "from", "to", "fee", "open", "scope", "mine", "volunteering"] as const).filter(
    (k) => p[k] !== undefined,
  ).length;
}
