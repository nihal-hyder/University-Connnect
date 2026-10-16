import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getRegistrationState } from "@/lib/events/registration-state";
import { searchEvents, type EventListItem } from "./events";

export async function getEditableProfile(userId: string) {
  const supabase = await createClient();
  const [profile, interests, prefs] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, avatar_path, university_id, campus_id, department_id, program, academic_level, graduation_year, city_id, bio, onboarded_at")
      .eq("id", userId)
      .single(),
    supabase.from("profile_interests").select("category_id").eq("profile_id", userId),
    supabase.from("user_preferences").select("email_reminders, email_recommendations, email_society_updates").eq("user_id", userId).maybeSingle(),
  ]);
  const p = profile.data;
  return {
    onboarded: Boolean(p?.onboarded_at),
    values: {
      fullName: p?.full_name ?? "",
      universityId: p?.university_id ?? "",
      campusId: p?.campus_id ?? "",
      departmentId: p?.department_id ?? "",
      program: p?.program ?? "",
      academicLevel: p?.academic_level ?? "",
      graduationYear: p?.graduation_year ? String(p.graduation_year) : "",
      cityId: p?.city_id ? String(p.city_id) : "",
      bio: p?.bio ?? "",
      avatarPath: p?.avatar_path ?? null,
      interests: (interests.data ?? []).map((i) => i.category_id),
    },
    preferences: {
      emailReminders: prefs.data?.email_reminders ?? true,
      emailRecommendations: prefs.data?.email_recommendations ?? false,
      emailSocietyUpdates: prefs.data?.email_society_updates ?? true,
    },
  };
}

const REG_EVENT = `id, slug, title, starts_at, ends_at, timezone, format, venue, is_demo, schedule_status, status,
  city:cities(name), university:universities!events_university_id_fkey(name, short_name), society:societies!events_society_id_fkey(name, slug)` as const;

export async function listMyRegistrations(userId: string, scope: "upcoming" | "past" | "all" = "all") {
  const supabase = await createClient();
  let query = supabase
    .from("registrations")
    .select(`id, status, reference_code, created_at, cancelled_at, team_name, event:events!inner(${REG_EVENT})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  const nowIso = new Date().toISOString();
  if (scope === "upcoming") query = query.gt("event.ends_at", nowIso).neq("status", "cancelled").neq("status", "rejected");
  if (scope === "past") query = query.lte("event.ends_at", nowIso);
  const { data, error } = await query;
  if (error) throw new Error(`listMyRegistrations failed: ${error.message}`);
  const rows = data ?? [];
  if (scope === "upcoming") rows.sort((a, b) => (a.event.starts_at ?? "").localeCompare(b.event.starts_at ?? ""));
  return rows;
}

export type MyRegistration = Awaited<ReturnType<typeof listMyRegistrations>>[number];

/** Shape a registration's event for <EventRow>. */
export function registrationRowEvent(r: MyRegistration) {
  return {
    slug: r.event.slug,
    title: r.event.title,
    starts_at: r.event.starts_at,
    ends_at: r.event.ends_at,
    timezone: r.event.timezone,
    society_name: r.event.society.name,
    format: r.event.format,
    city_name: r.event.city?.name ?? null,
    university_short: r.event.university?.short_name ?? null,
    university_name: r.event.university?.name ?? null,
    is_demo: r.event.is_demo,
  };
}

export async function listMyApplications(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("volunteer_applications")
    .select(
      `id, status, reference_code, created_at, offer_expires_at, updated_at,
       role:volunteer_roles!inner(id, title, time_commitment),
       event:events!inner(id, slug, title, starts_at, ends_at, timezone, schedule_status, is_demo, society:societies!events_society_id_fkey(name, slug))`,
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`listMyApplications failed: ${error.message}`);
  return data ?? [];
}

export type MyApplication = Awaited<ReturnType<typeof listMyApplications>>[number];

export type Recommendation = { event: EventListItem; reasons: string[]; score: number };

/**
 * Explainable, rule-based recommendations. Uses only what the student told
 * us (interests, university, level) and the events' own data. Each reason is
 * shown next to the event.
 */
export async function getRecommendations(
  profile: { university_id: string | null; university_name: string | null },
  interestSlugs: Map<string, string>,
  excludeIds: Set<string>,
  limit = 6,
) {
  const { items } = await searchEvents({ open: true, eligibleFor: profile.university_id ?? undefined, sort: "soonest" }, 1, 60);
  const now = Date.now();
  const scored: Recommendation[] = [];
  for (const e of items) {
    if (excludeIds.has(e.id)) continue;
    const reasons: string[] = [];
    let score = 0;
    const interest = e.category_slug ? interestSlugs.get(e.category_slug) : undefined;
    if (interest) {
      reasons.push(`Because you selected ${interest}`);
      score += 5;
    }
    if (profile.university_name && e.university_name === profile.university_name) {
      reasons.push("At your university");
      score += 3;
    } else if (e.eligibility_scope === "open" && profile.university_name) {
      score += 0.5;
    }
    const closes = e.registration_closes_at ? new Date(e.registration_closes_at).getTime() : null;
    if (closes && closes - now < 5 * 86400000) {
      reasons.push("Registration closes soon");
      score += 1;
    }
    const startsIn = e.starts_at ? new Date(e.starts_at).getTime() - now : Infinity;
    if (startsIn < 14 * 86400000) score += 1;
    // Only recommend with a stated reason; never pad the list silently.
    if (reasons.length) scored.push({ event: e, reasons, score });
  }
  scored.sort((a, b) => b.score - a.score || (a.event.starts_at ?? "").localeCompare(b.event.starts_at ?? ""));
  return scored.slice(0, limit);
}

/** Saved events whose registration closes within the next `days` days. */
export async function getDeadlineReminders(userId: string, days = 7) {
  const supabase = await createClient();
  const now = new Date();
  const until = new Date(now.getTime() + days * 86400000);
  const { data } = await supabase
    .from("saved_events")
    .select(
      `event:events!inner(id, slug, title, starts_at, ends_at, timezone, registration_closes_at, registration_opens_at, registration_mode,
        schedule_status, capacity, confirmed_count, waitlist_enabled, society:societies!events_society_id_fkey(name))`,
    )
    .eq("user_id", userId)
    .gt("event.registration_closes_at", now.toISOString())
    .lte("event.registration_closes_at", until.toISOString())
    .limit(10);
  return (data ?? [])
    .map((r) => r.event)
    .filter((e) => getRegistrationState(e) === "open" || getRegistrationState(e) === "waitlist")
    .sort((a, b) => (a.registration_closes_at ?? "").localeCompare(b.registration_closes_at ?? ""));
}

export async function getPendingInvitations(email: string | null) {
  if (!email) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("society_invitations")
    .select("id, role, expires_at, society:societies!inner(name, slug, logo_path)")
    .eq("status", "pending")
    .ilike("email", email)
    .gt("expires_at", new Date().toISOString());
  return data ?? [];
}
