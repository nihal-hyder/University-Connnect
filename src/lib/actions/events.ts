"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer } from "@/lib/auth/session";
import { fail, ok, userMessage, type ActionResult } from "@/lib/errors";
import { eventFormSchema, type EventFormValues } from "@/lib/events/event-schema";
import { localInputToIso } from "@/lib/format";
import { can } from "@/lib/permissions";
import { isPathInFolder } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import type { Json, TablesInsert } from "@/lib/supabase/database.types";

const SIGN_IN = "Please log in to continue.";
const uuid = z.string().uuid();

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 6);
}

function revalidateEvent(societySlug: string, eventSlug?: string) {
  revalidatePath(`/manage/${societySlug}`, "layout");
  if (eventSlug) revalidatePath(`/events/${eventSlug}`);
  revalidatePath("/explore");
  revalidatePath("/");
}

/**
 * Creates or updates an event from the wizard. The database enforces who may
 * do this (RLS + column grants) and the event constraints; this action adds
 * friendly validation, converts times to ISO and keeps related rows in sync.
 */
export async function saveEvent(input: {
  societyId: string;
  societySlug: string;
  values: EventFormValues;
}): Promise<ActionResult<{ id: string; slug: string }>> {
  const viewer = await getViewer();
  if (!viewer) return fail(SIGN_IN);
  if (!uuid.safeParse(input.societyId).success) return fail("Invalid society.");
  const parsed = eventFormSchema.safeParse(input.values);
  if (!parsed.success) {
    return fail("Some fields need attention.", z.flattenError(parsed.error).fieldErrors as Record<string, string[]>);
  }
  const v = parsed.data;
  const membership = viewer.memberships.find((m) => m.society_id === input.societyId);
  // Platform admins hold every society permission (migration 0022).
  const role = viewer.isAdmin ? "owner" : membership?.role;
  if (!v.id && !can(role, "create_events")) return fail("You do not have permission to create events for this society.");
  if (!isPathInFolder(v.coverPath, `societies/${input.societyId}`)) return fail("That cover image cannot be used.");

  const tz = v.timezone || "Asia/Karachi";
  const iso = (s: string) => (s ? localInputToIso(s, tz) : null);
  const tags = Array.from(new Set(v.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))).slice(0, 10);
  const num = (s: string) => (s === "" ? null : Number(s));

  const row = {
    title: v.title,
    summary: v.summary || null,
    description: v.description || null,
    agenda: v.agenda.map((a) => ({ title: a.title, ...(a.time ? { time: a.time } : {}), ...(a.detail ? { detail: a.detail } : {}) })),
    speakers: v.speakers.map((s) => ({ name: s.name, ...(s.title ? { title: s.title } : {}) })),
    tags,
    category_id: v.categoryId ? Number(v.categoryId) : null,
    event_type: v.eventType,
    cover_path: v.coverPath,
    starts_at: iso(v.startsAt),
    ends_at: iso(v.endsAt),
    timezone: tz,
    format: v.format,
    university_id: v.universityId || null,
    campus_id: v.campusId || null,
    city_id: v.cityId ? Number(v.cityId) : null,
    venue: v.format === "online" ? null : v.venue || null,
    online_url: v.format === "in_person" ? null : v.onlineUrl || null,
    accessibility_info: v.accessibilityInfo || null,
    contact_email: v.contactEmail || null,
    contact_phone: v.contactPhone || null,
    eligibility_scope: v.eligibilityScope,
    eligible_levels: v.eligibleLevels,
    eligibility_notes: v.eligibilityNotes || null,
    registration_mode: v.registrationMode,
    external_registration_url: v.registrationMode === "external" ? v.externalRegistrationUrl || null : null,
    // Always true: every registration is confirmed by the organisers (DB constraint, migration 0022).
    requires_approval: true,
    require_university_email: v.requireUniversityEmail,
    capacity: num(v.capacity),
    waitlist_enabled: v.waitlistEnabled,
    team_min: v.registrationMode === "team" ? num(v.teamMin) : null,
    team_max: v.registrationMode === "team" ? num(v.teamMax) : null,
    registration_opens_at: iso(v.registrationOpensAt),
    registration_closes_at: iso(v.registrationClosesAt),
    terms_text: v.termsText || null,
    is_free: v.isFree,
    fee_amount: v.isFree ? null : num(v.feeAmount),
    fee_description: v.isFree ? null : v.feeDescription || null,
    payment_instructions: v.isFree ? null : v.paymentInstructions || null,
    payment_url: v.isFree ? null : v.paymentUrl || null,
    refund_policy: v.refundPolicy || null,
    volunteer_recruitment_open: v.volunteerRecruitmentOpen,
    publish_at: iso(v.publishAt),
  } satisfies Partial<TablesInsert<"events">>;

  const supabase = await createClient();
  let id = v.id;
  let slug = v.slug || "";

  if (id) {
    const update = { ...row, ...(slug ? { slug } : {}) };
    const { data, error } = await supabase.from("events").update(update).eq("id", id).select("id, slug").maybeSingle();
    if (error) {
      if (error.code === "23505") return fail("That link is already used by another event.", { slug: ["Choose a different link"] });
      return fail(userMessage(error, "We could not save the event."));
    }
    if (!data) return fail("You do not have permission to edit this event.");
    slug = data.slug;
  } else {
    const base = slug || slugify(v.title) || "event";
    let attempt = base;
    for (let i = 0; i < 4; i++) {
      const { data, error } = await supabase
        .from("events")
        .insert({ ...row, society_id: input.societyId, slug: attempt })
        .select("id, slug")
        .single();
      if (!error) {
        id = data.id;
        slug = data.slug;
        break;
      }
      if (error.code !== "23505") return fail(userMessage(error, "We could not create the event."));
      if (v.slug) return fail("That link is already used by another event.", { slug: ["Choose a different link"] });
      attempt = `${base.slice(0, 74)}-${randomSuffix()}`;
    }
    if (!id) return fail("We could not create a unique link for this event. Set one manually.");
  }

  // Eligible universities
  const { data: existingTargets } = await supabase.from("event_target_universities").select("university_id").eq("event_id", id);
  const wantTargets = new Set(v.eligibilityScope === "selected_universities" ? v.targetUniversityIds : []);
  const haveTargets = new Set((existingTargets ?? []).map((t) => t.university_id));
  const removeTargets = [...haveTargets].filter((t) => !wantTargets.has(t));
  const addTargets = [...wantTargets].filter((t) => !haveTargets.has(t));
  if (removeTargets.length) await supabase.from("event_target_universities").delete().eq("event_id", id).in("university_id", removeTargets);
  if (addTargets.length) {
    const { error } = await supabase.from("event_target_universities").insert(addTargets.map((university_id) => ({ event_id: id!, university_id })));
    if (error) return fail(userMessage(error, "The event was saved, but eligible universities could not be updated."));
  }

  // Registration form (versioned by the database once answers exist)
  const { error: formError } = await supabase.rpc("save_form", { p_event: id, p_role: null as unknown as string, p_fields: v.formFields as Json });
  if (formError) return fail(userMessage(formError, "The event was saved, but the registration form could not be saved."));

  // Volunteer roles: only for members who manage volunteers on the host society.
  if (can(role, "manage_volunteers")) {
    const roleResult = await syncRoles(id, v.roles);
    if (!roleResult.ok) return roleResult;
  }

  revalidateEvent(input.societySlug, slug);
  return ok({ id, slug }, v.id ? "Changes saved." : "Draft created.");
}

async function syncRoles(eventId: string, roles: EventFormValues["roles"]): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { data: existing } = await supabase.from("volunteer_roles").select("id, application_count").eq("event_id", eventId);
  const keep = new Set(roles.flatMap((r) => (r.id ? [r.id] : [])));
  for (const old of existing ?? []) {
    if (keep.has(old.id)) continue;
    if (old.application_count > 0) {
      return fail("A volunteer role that already has applications cannot be deleted. Close it from the Volunteers page instead.");
    }
    const { error } = await supabase.from("volunteer_roles").delete().eq("id", old.id);
    if (error) return fail(userMessage(error, "A volunteer role could not be removed."));
  }
  for (const [index, r] of roles.entries()) {
    const row = {
      title: r.title,
      description: r.description || null,
      responsibilities: r.responsibilities || null,
      positions: Number(r.positions),
      skills: Array.from(new Set(r.skills.split(",").map((s) => s.trim()).filter(Boolean))).slice(0, 15),
      eligibility: r.eligibility || null,
      experience_level: r.experienceLevel,
      time_commitment: r.timeCommitment || null,
      schedule_notes: r.scheduleNotes || null,
      application_deadline: r.applicationDeadline ? localInputToIso(r.applicationDeadline) : null,
      is_paid: r.isPaid,
      compensation_details: r.isPaid ? r.compensationDetails || null : null,
      benefits: r.benefits || null,
      selection_process: r.selectionProcess || null,
      requires_event_registration: r.requiresEventRegistration,
      sort_order: index,
    };
    const { error } = r.id
      ? await supabase.from("volunteer_roles").update(row).eq("id", r.id).eq("event_id", eventId)
      : await supabase.from("volunteer_roles").insert({ ...row, event_id: eventId });
    if (error) return fail(userMessage(error, `The volunteer role "${r.title}" could not be saved.`));
  }
  return ok(null);
}

type Ctx = { societySlug: string; eventSlug?: string };

async function rpc(call: () => PromiseLike<{ error: { code?: string; message?: string } | null }>, ctx: Ctx, message: string): Promise<ActionResult<null>> {
  if (!(await getViewer())) return fail(SIGN_IN);
  const { error } = await call();
  if (error) return fail(userMessage(error));
  revalidateEvent(ctx.societySlug, ctx.eventSlug);
  return ok(null, message);
}

export async function submitEvent(eventId: string, ctx: Ctx): Promise<ActionResult<{ status: string }>> {
  if (!(await getViewer())) return fail(SIGN_IN);
  if (!uuid.safeParse(eventId).success) return fail("Invalid event.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_event", { p_event: eventId });
  if (error) return fail(userMessage(error, "We could not submit the event."));
  revalidateEvent(ctx.societySlug, ctx.eventSlug);
  return ok(
    { status: data },
    data === "published" ? "Event published." : "Submitted for review. Platform staff will check it before it goes live.",
  );
}

export async function withdrawSubmission(eventId: string, ctx: Ctx) {
  const supabase = await createClient();
  return rpc(() => supabase.rpc("withdraw_event_submission", { p_event: eventId }), ctx, "Submission withdrawn. The event is a draft again.");
}

export async function setScheduleStatus(eventId: string, status: "scheduled" | "postponed" | "cancelled", ctx: Ctx, note?: string) {
  if (!z.enum(["scheduled", "postponed", "cancelled"]).safeParse(status).success) return fail("Invalid status.");
  const supabase = await createClient();
  return rpc(
    () => supabase.rpc("set_event_schedule_status", { p_event: eventId, p_status: status, p_note: note?.slice(0, 1000) || undefined }),
    ctx,
    status === "cancelled" ? "Event cancelled. Participants have been notified." : status === "postponed" ? "Event marked as postponed. Participants have been notified." : "Event is back on schedule.",
  );
}

export async function duplicateEvent(eventId: string, ctx: Ctx): Promise<ActionResult<{ id: string }>> {
  if (!(await getViewer())) return fail(SIGN_IN);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("duplicate_event", { p_event: eventId });
  if (error) return fail(userMessage(error, "We could not duplicate the event."));
  revalidateEvent(ctx.societySlug);
  return ok({ id: data }, "Copy created as a draft.");
}

export async function deleteDraftEvent(eventId: string, ctx: Ctx): Promise<ActionResult<null>> {
  if (!(await getViewer())) return fail(SIGN_IN);
  const supabase = await createClient();
  const { error, count } = await supabase.from("events").delete({ count: "exact" }).eq("id", eventId).eq("status", "draft");
  if (error) return fail(userMessage(error));
  if (!count) return fail("Only drafts without registrations can be deleted.");
  revalidateEvent(ctx.societySlug);
  return ok(null, "Draft deleted.");
}

// --- Registrations ----------------------------------------------------------
const regStatus = z.enum(["confirmed", "rejected", "waitlisted"]);

export async function setRegistrationStatus(registrationId: string, status: "confirmed" | "rejected" | "waitlisted", ctx: Ctx, note?: string) {
  if (!uuid.safeParse(registrationId).success || !regStatus.safeParse(status).success) return fail("Invalid request.");
  const supabase = await createClient();
  return rpc(
    () => supabase.rpc("organizer_set_registration_status", { p_registration: registrationId, p_status: status, p_note: note?.slice(0, 1000) || undefined }),
    ctx,
    status === "confirmed" ? "Registration confirmed. The participant was notified." : status === "waitlisted" ? "Moved to the waitlist." : "Registration declined. The participant was notified.",
  );
}

export type CheckInResult = { result: "checked_in" | "already_checked_in" | "invalid" | "wrong_event" | "not_eligible" | "undone"; name?: string; reference?: string; checked_in_at?: string; status?: string };

export async function checkInByCode(eventId: string, code: string): Promise<ActionResult<CheckInResult>> {
  if (!(await getViewer())) return fail(SIGN_IN);
  const clean = code.trim().slice(0, 200);
  if (!uuid.safeParse(eventId).success || clean.length < 6) return fail("Enter or scan a ticket code.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_in_ticket", { p_event: eventId, p_code: clean });
  if (error) return fail(userMessage(error, "Check-in failed. Try again."));
  return ok(data as CheckInResult);
}

export async function manualCheckIn(registrationId: string, undo: boolean, ctx: Ctx): Promise<ActionResult<null>> {
  if (!(await getViewer())) return fail(SIGN_IN);
  if (!uuid.safeParse(registrationId).success) return fail("Invalid registration.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("manual_check_in", { p_registration: registrationId, p_undo: undo });
  if (error) return fail(userMessage(error));
  const r = (data as CheckInResult).result;
  revalidateEvent(ctx.societySlug);
  if (r === "not_eligible") return fail("Only confirmed registrations can be checked in.");
  return ok(null, r === "undone" ? "Check-in removed." : r === "already_checked_in" ? "Already checked in." : "Checked in.");
}

// --- Collaboration ----------------------------------------------------------
const collabPerms = z.object({
  canEditDetails: z.boolean(),
  canManageVolunteers: z.boolean(),
  canViewRegistrations: z.boolean(),
  canCheckIn: z.boolean(),
  canViewAnalytics: z.boolean(),
});

export async function inviteCollaborator(input: {
  eventId: string;
  societyId: string;
  message?: string;
  perms: z.infer<typeof collabPerms>;
  ctx: Ctx;
}): Promise<ActionResult<null>> {
  if (!(await getViewer())) return fail(SIGN_IN);
  const parsed = z.object({ eventId: uuid, societyId: uuid, message: z.string().max(1000).optional(), perms: collabPerms }).safeParse(input);
  if (!parsed.success) return fail("Choose a society to invite.");
  const p = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("invite_collaborator", {
    p_event: p.eventId,
    p_society: p.societyId,
    p_can_edit_details: p.perms.canEditDetails,
    p_can_manage_volunteers: p.perms.canManageVolunteers,
    p_can_view_registrations: p.perms.canViewRegistrations,
    p_can_check_in: p.perms.canCheckIn,
    p_can_view_analytics: p.perms.canViewAnalytics,
    p_message: p.message || undefined,
  });
  if (error) return fail(userMessage(error, "We could not send the invitation."));
  revalidateEvent(input.ctx.societySlug, input.ctx.eventSlug);
  return ok(null, "Invitation sent. The society's managers will be notified.");
}

export async function updateCollaborationPermissions(collaborationId: string, perms: z.infer<typeof collabPerms>, ctx: Ctx) {
  if (!uuid.safeParse(collaborationId).success || !collabPerms.safeParse(perms).success) return fail("Invalid request.");
  const supabase = await createClient();
  return rpc(
    () =>
      supabase.rpc("update_collaboration_permissions", {
        p_collaboration: collaborationId,
        p_can_edit_details: perms.canEditDetails,
        p_can_manage_volunteers: perms.canManageVolunteers,
        p_can_view_registrations: perms.canViewRegistrations,
        p_can_check_in: perms.canCheckIn,
        p_can_view_analytics: perms.canViewAnalytics,
      }),
    ctx,
    "Permissions updated.",
  );
}

export async function respondToCollaboration(collaborationId: string, accept: boolean, ctx: Ctx) {
  if (!uuid.safeParse(collaborationId).success) return fail("Invalid invitation.");
  const supabase = await createClient();
  return rpc(
    () => supabase.rpc("respond_collaboration", { p_collaboration: collaborationId, p_accept: accept }),
    ctx,
    accept ? "You are now co-organising this event." : "Invitation declined.",
  );
}

export async function revokeCollaboration(collaborationId: string, ctx: Ctx) {
  if (!uuid.safeParse(collaborationId).success) return fail("Invalid collaboration.");
  const supabase = await createClient();
  return rpc(() => supabase.rpc("revoke_collaboration", { p_collaboration: collaborationId }), ctx, "Collaboration ended.");
}

// --- Announcements ----------------------------------------------------------
const AUDIENCES = ["all_registrants", "confirmed", "waitlisted", "pending", "accepted_volunteers", "all_volunteers", "shift"] as const;

export async function sendAnnouncement(input: {
  eventId: string;
  audience: string;
  shiftId?: string;
  title: string;
  body: string;
  sendEmail: boolean;
  ctx: Ctx;
}): Promise<ActionResult<{ recipients: number }>> {
  if (!(await getViewer())) return fail(SIGN_IN);
  const parsed = z
    .object({
      eventId: uuid,
      audience: z.enum(AUDIENCES),
      shiftId: z.union([uuid, z.literal("")]).optional(),
      title: z.string().trim().min(3, "Add a short title").max(120),
      body: z.string().trim().min(5, "Write a message").max(2000),
      sendEmail: z.boolean(),
    })
    .safeParse(input);
  if (!parsed.success) return fail("Please check the message.", z.flattenError(parsed.error).fieldErrors);
  const a = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("send_event_announcement", {
    p_event: a.eventId,
    p_audience: a.audience,
    p_title: a.title,
    p_body: a.body,
    p_send_email: a.sendEmail,
    p_shift: a.audience === "shift" && a.shiftId ? a.shiftId : undefined,
  });
  if (error) return fail(userMessage(error, "We could not send the announcement."));
  revalidateEvent(input.ctx.societySlug);
  return ok({ recipients: data ?? 0 }, data ? `Sent to ${data} ${data === 1 ? "person" : "people"}.` : "Nobody matches that audience yet, so nothing was sent.");
}
