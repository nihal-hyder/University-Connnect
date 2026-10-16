import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getViewer, requireSocietyAccess, type SocietyContext } from "@/lib/auth/session";
import { can, type SocietyPermission } from "@/lib/permissions";
import { parseStoredFields } from "@/lib/forms/schema";
import { createClient } from "@/lib/supabase/server";
import { getDirectory } from "./events";

/** Every event column the organiser UI may read (see migration 0015). */
export const MANAGE_EVENT_COLUMNS = `id, society_id, slug, title, summary, description, agenda, speakers, tags, category_id, event_type, cover_path,
  starts_at, ends_at, timezone, format, university_id, campus_id, city_id, venue, accessibility_info,
  eligibility_scope, eligible_levels, eligibility_notes, registration_mode, external_registration_url, requires_approval,
  capacity, waitlist_enabled, team_min, team_max, registration_opens_at, registration_closes_at, terms_text,
  is_free, fee_amount, fee_currency, fee_description, payment_instructions, payment_url, refund_policy,
  contact_email, contact_phone, volunteer_recruitment_open, require_university_email, status, schedule_status, schedule_note,
  publish_at, published_at, submitted_at, confirmed_count, pending_count, waitlist_count, is_demo, created_at, updated_at,
  category:event_categories(name, slug), host:societies!events_society_id_fkey(id, name, slug)` as const;

export type EventAccess = {
  isHost: boolean;
  view: boolean;
  edit: boolean;
  publish: boolean;
  cancel: boolean;
  viewRegistrations: boolean;
  manageRegistrations: boolean;
  exportData: boolean;
  checkIn: boolean;
  manageVolunteers: boolean;
  viewApplicants: boolean;
  issueCertificates: boolean;
  manageCollaborations: boolean;
  viewAnalytics: boolean;
};

type Collab = {
  can_edit_details: boolean;
  can_manage_volunteers: boolean;
  can_view_registrations: boolean;
  can_check_in: boolean;
  can_view_analytics: boolean;
};

/**
 * Mirror of private.event_permission(): host society members get their role's
 * permissions; an accepted collaborator gets the intersection of its role
 * permissions and the flags the host granted. UI only — every action is
 * re-authorised in the database.
 */
export function computeEventAccess(ctx: Pick<SocietyContext, "can">, isHost: boolean, collab: Collab | null): EventAccess {
  const c = (p: SocietyPermission) => ctx.can(p);
  if (isHost) {
    return {
      isHost,
      view: c("view_society"),
      edit: c("edit_events"),
      publish: c("publish_events"),
      cancel: c("cancel_events"),
      viewRegistrations: c("view_registrations"),
      manageRegistrations: c("manage_registrations"),
      exportData: c("export_data"),
      checkIn: c("check_in"),
      manageVolunteers: c("manage_volunteers"),
      viewApplicants: c("view_volunteer_applicants"),
      issueCertificates: c("issue_certificates"),
      manageCollaborations: c("manage_collaborations"),
      viewAnalytics: c("view_analytics"),
    };
  }
  const g = collab ?? { can_edit_details: false, can_manage_volunteers: false, can_view_registrations: false, can_check_in: false, can_view_analytics: false };
  return {
    isHost,
    view: c("view_society"),
    edit: c("edit_events") && g.can_edit_details,
    publish: false,
    cancel: false,
    viewRegistrations: c("view_registrations") && g.can_view_registrations,
    manageRegistrations: false,
    exportData: c("export_data") && g.can_view_registrations,
    checkIn: c("check_in") && g.can_check_in,
    manageVolunteers: c("manage_volunteers") && g.can_manage_volunteers,
    viewApplicants: c("view_volunteer_applicants") && g.can_manage_volunteers,
    issueCertificates: false,
    manageCollaborations: false,
    viewAnalytics: c("view_analytics") && g.can_view_analytics,
  };
}

/**
 * Loads an event for the management UI. 404s unless the event belongs to the
 * society in the URL or that society is an accepted collaborator.
 */
export const getManagedEvent = cache(async (slug: string, eventId: string) => {
  const ctx = await requireSocietyAccess(slug);
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) notFound();
  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select(MANAGE_EVENT_COLUMNS).eq("id", eventId).maybeSingle();
  if (!event) notFound();
  const isHost = event.society_id === ctx.society.id;
  let collab: Collab | null = null;
  if (!isHost) {
    const { data } = await supabase
      .from("event_collaborations")
      .select("can_edit_details, can_manage_volunteers, can_view_registrations, can_check_in, can_view_analytics")
      .eq("event_id", event.id)
      .eq("society_id", ctx.society.id)
      .eq("status", "accepted")
      .maybeSingle();
    if (!data) notFound();
    collab = data;
  }
  const access = computeEventAccess(ctx, isHost, collab);
  if (!access.view) notFound();
  return { ctx, event, access };
});

export type ManagedEvent = Awaited<ReturnType<typeof getManagedEvent>>["event"];

export async function requireEventAccess(slug: string, eventId: string, need: keyof EventAccess) {
  const result = await getManagedEvent(slug, eventId);
  if (!result.access[need]) notFound();
  return result;
}

export async function getEventForm(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("form_versions")
    .select("id, version, fields")
    .eq("event_id", eventId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { id: data?.id ?? null, version: data?.version ?? 0, fields: parseStoredFields(data?.fields ?? []) };
}

export async function listSocietyEvents(societyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, slug, title, status, schedule_status, starts_at, ends_at, timezone, capacity, confirmed_count, pending_count, waitlist_count, volunteer_recruitment_open, is_demo, updated_at",
    )
    .eq("society_id", societyId)
    .order("starts_at", { ascending: false, nullsFirst: true })
    .limit(200);
  if (error) throw new Error(`listSocietyEvents failed: ${error.message}`);
  return data ?? [];
}

export type SocietyEventRow = Awaited<ReturnType<typeof listSocietyEvents>>[number];

/** Everything the event wizard needs, for a new event or an existing one. */
export async function getWizardData(ctx: SocietyContext, eventId?: string) {
  const supabase = await createClient();
  const [directory, societies] = await Promise.all([
    getDirectory(),
    supabase
      .from("societies")
      .select("id, name, university:universities(short_name, name)")
      .eq("status", "active")
      .neq("id", ctx.society.id)
      .order("name")
      .limit(500),
  ]);
  const { data: societyRow } = await supabase.from("societies").select("events_require_review, university_id").eq("id", ctx.society.id).single();
  const collabSocieties = (societies.data ?? []).map((s) => ({ id: s.id, name: s.name, university: s.university?.short_name ?? s.university?.name ?? null }));

  if (!eventId) {
    return { directory, collabSocieties, eventsRequireReview: societyRow?.events_require_review ?? true, defaultUniversityId: societyRow?.university_id ?? "", existing: null };
  }

  const [targets, form, roles] = await Promise.all([
    supabase.from("event_target_universities").select("university_id").eq("event_id", eventId),
    getEventForm(eventId),
    supabase
      .from("volunteer_roles")
      .select(
        "id, title, description, responsibilities, positions, skills, eligibility, experience_level, time_commitment, schedule_notes, application_deadline, is_paid, compensation_details, benefits, selection_process, requires_event_registration",
      )
      .eq("event_id", eventId)
      .order("sort_order"),
  ]);
  const { count: submissions } = form.id
    ? await supabase.from("registrations").select("id", { count: "exact", head: true }).eq("form_version_id", form.id)
    : { count: 0 };
  return {
    directory,
    collabSocieties,
    eventsRequireReview: societyRow?.events_require_review ?? true,
    defaultUniversityId: societyRow?.university_id ?? "",
    existing: {
      targets: (targets.data ?? []).map((t) => t.university_id),
      formFields: form.fields,
      formHasSubmissions: (submissions ?? 0) > 0,
      roles: roles.data ?? [],
    },
  };
}

/**
 * Non-throwing variant for route handlers (CSV exports): resolves the
 * viewer's best access to an event across host and collaborator memberships.
 */
export async function resolveEventAccess(eventId: string) {
  const viewer = await getViewer();
  if (!viewer || !/^[0-9a-f-]{36}$/i.test(eventId)) return null;
  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("id, slug, title, society_id").eq("id", eventId).maybeSingle();
  if (!event) return null;
  // Platform admins act with full powers on any event (the database agrees).
  if (viewer.isAdmin) return { viewer, event, access: computeEventAccess({ can: () => true }, true, null) };
  const hostMembership = viewer.memberships.find((m) => m.society_id === event.society_id);
  const ctxFor = (m: (typeof viewer.memberships)[number]) => ({
    can: (p: Parameters<typeof can>[1]) => can(m.role, p) && (m.society.status === "active" || ["view_society", "view_registrations", "view_volunteer_applicants", "view_analytics", "export_data"].includes(p)),
  });
  if (hostMembership) return { viewer, event, access: computeEventAccess(ctxFor(hostMembership), true, null) };
  const { data: collabs } = await supabase
    .from("event_collaborations")
    .select("society_id, can_edit_details, can_manage_volunteers, can_view_registrations, can_check_in, can_view_analytics")
    .eq("event_id", event.id)
    .eq("status", "accepted");
  for (const c of collabs ?? []) {
    const m = viewer.memberships.find((x) => x.society_id === c.society_id);
    if (m) return { viewer, event, access: computeEventAccess(ctxFor(m), false, c) };
  }
  return null;
}
