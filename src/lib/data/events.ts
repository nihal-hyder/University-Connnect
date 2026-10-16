import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];
export type EventListItem = Database["public"]["Functions"]["search_events"]["Returns"][number];
type SearchArgs = Database["public"]["Functions"]["search_events"]["Args"];

export type EventFilters = {
  q?: string;
  category?: string;
  type?: Enums["event_type"];
  university?: string;
  campus?: string;
  city?: number;
  format?: Enums["event_format"];
  from?: string;
  to?: string;
  free?: boolean;
  open?: boolean;
  eligibleFor?: string;
  scope?: Enums["eligibility_scope"];
  society?: string;
  volunteering?: boolean;
  includePast?: boolean;
  sort?: "soonest" | "newest" | "deadline" | "relevance";
};

export async function searchEvents(filters: EventFilters, page = 1, pageSize = 12) {
  const supabase = await createClient();
  const args: SearchArgs = {
    p_q: filters.q || undefined,
    p_category: filters.category || undefined,
    p_type: filters.type,
    p_university: filters.university,
    p_campus: filters.campus,
    p_city: filters.city,
    p_format: filters.format,
    p_from: filters.from,
    p_to: filters.to,
    p_free: filters.free,
    p_open_only: filters.open ?? false,
    p_eligible_for: filters.eligibleFor,
    p_scope: filters.scope,
    p_society: filters.society,
    p_volunteering: filters.volunteering ?? false,
    p_include_past: filters.includePast ?? false,
    p_sort: filters.sort ?? (filters.q ? "relevance" : "soonest"),
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
  };
  const { data, error } = await supabase.rpc("search_events", args);
  if (error) throw new Error(`search_events failed: ${error.message}`);
  const items = data ?? [];
  return { items, total: items.length ? Number(items[0].total_count) : 0 };
}

async function categoryIdFromSlug(slug: string | undefined) {
  if (!slug) return undefined;
  const supabase = await createClient();
  const { data } = await supabase.from("event_categories").select("id").eq("slug", slug).maybeSingle();
  return data?.id ?? -1;
}

const OPPORTUNITY_SELECT = `id, title, positions, accepted_count, application_deadline, time_commitment, experience_level, is_paid, skills,
  event:events!inner(id, slug, title, starts_at, ends_at, timezone, format, is_demo, publish_at, category_id,
    category:event_categories(slug, name), city:cities(name), society:societies!events_society_id_fkey!inner(name, slug))` as const;

/** Open volunteer roles on publicly visible, upcoming, non-cancelled events. */
export async function listOpportunities(options: { limit?: number; offset?: number; city?: number; category?: string } = {}) {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const categoryId = await categoryIdFromSlug(options.category);
  const from = options.offset ?? 0;
  const to = from + (options.limit ?? 12) - 1;

  let query = supabase
    .from("volunteer_roles")
    .select(OPPORTUNITY_SELECT, { count: "exact" })
    .eq("status", "open")
    .eq("event.status", "published")
    .eq("event.schedule_status", "scheduled")
    .eq("event.volunteer_recruitment_open", true)
    .eq("event.society.status", "active")
    .gt("event.ends_at", nowIso)
    .or(`publish_at.is.null,publish_at.lte.${nowIso}`, { referencedTable: "event" })
    .or(`application_deadline.is.null,application_deadline.gt.${nowIso}`)
    .order("application_deadline", { ascending: true, nullsFirst: false })
    .range(from, to);

  if (options.city) query = query.eq("event.city_id", options.city);
  if (categoryId !== undefined) query = query.eq("event.category_id", categoryId);

  const { data, error, count } = await query;
  if (error) throw new Error(`listOpportunities failed: ${error.message}`);
  return { items: data ?? [], total: count ?? 0 };
}

export type OpportunityItem = Awaited<ReturnType<typeof listOpportunities>>["items"][number];

export async function listSocieties(
  options: { q?: string; university?: string; category?: string; limit?: number; offset?: number } = {},
) {
  const supabase = await createClient();
  const categoryId = await categoryIdFromSlug(options.category);
  const from = options.offset ?? 0;
  let query = supabase
    .from("societies")
    .select(
      "id, slug, name, logo_path, description, scope_label, is_demo, university:universities(name, short_name), category:event_categories(name, slug)",
      { count: "exact" },
    )
    .eq("status", "active")
    .order("name")
    .range(from, from + (options.limit ?? 24) - 1);
  if (options.q) query = query.ilike("name", `%${options.q.replace(/[%_\\,()]/g, "")}%`);
  if (options.university) query = query.eq("university_id", options.university);
  if (categoryId !== undefined) query = query.eq("category_id", categoryId);
  const { data, error, count } = await query;
  if (error) throw new Error(`listSocieties failed: ${error.message}`);
  return { items: data ?? [], total: count ?? 0 };
}

export type SocietyListItem = Awaited<ReturnType<typeof listSocieties>>["items"][number];

/** Directory lookups used by filters and forms. Public reference data. */
export async function getDirectory() {
  const supabase = await createClient();
  const [universities, campuses, cities, categories, departments] = await Promise.all([
    supabase.from("universities").select("id, name, short_name, slug, city_id, email_domains").eq("is_active", true).order("name"),
    supabase.from("campuses").select("id, name, university_id, city_id").eq("is_active", true).order("name"),
    supabase.from("cities").select("id, name, province").eq("is_active", true).order("name"),
    supabase.from("event_categories").select("id, slug, name, description").eq("is_active", true).order("sort_order"),
    supabase.from("departments").select("id, name, university_id").eq("is_active", true).order("name"),
  ]);
  return {
    universities: universities.data ?? [],
    campuses: campuses.data ?? [],
    cities: cities.data ?? [],
    categories: categories.data ?? [],
    departments: departments.data ?? [],
  };
}

export type Directory = Awaited<ReturnType<typeof getDirectory>>;
