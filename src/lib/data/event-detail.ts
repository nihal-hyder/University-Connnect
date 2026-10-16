import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { parseStoredFields } from "@/lib/forms/schema";

/**
 * Public event page data. Columns are listed explicitly: online_url is only
 * returned to confirmed participants (see getViewerEventState) and nothing
 * about other attendees is ever selected.
 */
const EVENT_COLUMNS = `id, society_id, slug, title, summary, description, agenda, speakers, tags, event_type, cover_path,
  starts_at, ends_at, timezone, format, venue, accessibility_info, eligibility_scope, eligible_levels, eligibility_notes,
  registration_mode, external_registration_url, requires_approval, capacity, waitlist_enabled, team_min, team_max,
  registration_opens_at, registration_closes_at, terms_text, is_free, fee_amount, fee_currency, fee_description,
  payment_instructions, payment_url, refund_policy, contact_email, contact_phone, volunteer_recruitment_open, require_university_email,
  status, schedule_status, schedule_note, publish_at, published_at, confirmed_count, is_demo, updated_at,
  category:event_categories(id, slug, name),
  university:universities!events_university_id_fkey(id, name, short_name),
  campus:campuses(name),
  city:cities(name),
  society:societies!events_society_id_fkey(id, slug, name, logo_path, status, verified_at, is_demo, university:universities(short_name, name))` as const;

export const getEventBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data: event, error } = await supabase.from("events").select(EVENT_COLUMNS).eq("slug", slug).maybeSingle();
  if (error) throw new Error(`Failed to load event: ${error.message}`);
  if (!event) return null;

  const [roles, collaborators, form, targets] = await Promise.all([
    supabase
      .from("volunteer_roles")
      .select(
        "id, title, description, responsibilities, positions, accepted_count, skills, eligibility, experience_level, time_commitment, schedule_notes, application_deadline, is_paid, compensation_details, benefits, selection_process, requires_event_registration, status, assigned_society:societies(name)",
      )
      .eq("event_id", event.id)
      .order("sort_order"),
    supabase
      .from("event_collaborations")
      .select("id, society:societies(slug, name, logo_path)")
      .eq("event_id", event.id)
      .eq("status", "accepted"),
    supabase.from("form_versions").select("fields").eq("event_id", event.id).order("version", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("event_target_universities").select("university:universities(id, name, short_name)").eq("event_id", event.id),
  ]);

  const roleIds = (roles.data ?? []).map((r) => r.id);
  const roleForms = roleIds.length
    ? await supabase.from("form_versions").select("volunteer_role_id, version, fields").in("volunteer_role_id", roleIds).order("version", { ascending: false })
    : { data: [] as { volunteer_role_id: string | null; version: number; fields: unknown }[] };
  const latestRoleForm = new Map<string, ReturnType<typeof parseStoredFields>>();
  for (const f of roleForms.data ?? []) {
    if (f.volunteer_role_id && !latestRoleForm.has(f.volunteer_role_id)) latestRoleForm.set(f.volunteer_role_id, parseStoredFields(f.fields));
  }

  return {
    event,
    roles: (roles.data ?? []).map((r) => ({ ...r, fields: latestRoleForm.get(r.id) ?? [] })),
    collaborators: (collaborators.data ?? []).flatMap((c) => (c.society ? [c.society] : [])),
    fields: parseStoredFields(form.data?.fields ?? []),
    targetUniversities: (targets.data ?? []).flatMap((t) => (t.university ? [t.university] : [])),
  };
});

export type EventDetail = NonNullable<Awaited<ReturnType<typeof getEventBySlug>>>;

/** The viewer's own relationship to the event: registration, saves, applications. */
export async function getViewerEventState(eventId: string, userId: string | null) {
  if (!userId) return { registration: null, saved: false, applications: [] as { role_id: string; status: string; reference_code: string }[], savedRoles: [] as string[], onlineUrl: null as string | null };
  const supabase = await createClient();
  const [reg, saved, apps, savedRoles] = await Promise.all([
    supabase
      .from("registrations")
      .select("id, status, reference_code")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .neq("status", "cancelled")
      .maybeSingle(),
    supabase.from("saved_events").select("event_id").eq("event_id", eventId).eq("user_id", userId).maybeSingle(),
    supabase.from("volunteer_applications").select("role_id, status, reference_code").eq("event_id", eventId).eq("user_id", userId).neq("status", "withdrawn"),
    supabase.from("saved_opportunities").select("role_id").eq("user_id", userId),
  ]);
  let onlineUrl: string | null = null;
  if (reg.data?.status === "confirmed") {
    // online_url is not column-readable; the function checks participation.
    const { data } = await supabase.rpc("event_private_details", { p_event: eventId });
    const details = data as { online_url?: string | null } | null;
    onlineUrl = details?.online_url ?? null;
  }
  return {
    registration: reg.data,
    saved: Boolean(saved.data),
    applications: apps.data ?? [],
    savedRoles: (savedRoles.data ?? []).map((r) => r.role_id),
    onlineUrl,
  };
}
