"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { fail, ok, userMessage, type ActionResult } from "@/lib/errors";
import { localInputToIso } from "@/lib/format";
import { formFieldsSchema, type FormField } from "@/lib/forms/schema";
import { createClient } from "@/lib/supabase/server";
import type { Json, TablesInsert } from "@/lib/supabase/database.types";

const SIGN_IN = "Please log in to continue.";
const uuid = z.string().uuid();
type Ctx = { societySlug: string };

function refresh(ctx: Ctx) {
  revalidatePath(`/manage/${ctx.societySlug}`, "layout");
}

const ORGANISER_STATUSES = ["under_review", "shortlisted", "interview_requested", "offered", "waitlisted", "rejected", "completed"] as const;

/** All state changes go through the database state machine. */
export async function updateApplicationStatus(
  applicationId: string,
  status: (typeof ORGANISER_STATUSES)[number],
  ctx: Ctx,
  message?: string,
  offerExpiresLocal?: string,
): Promise<ActionResult<null>> {
  if (!(await getSessionUser())) return fail(SIGN_IN);
  if (!uuid.safeParse(applicationId).success || !z.enum(ORGANISER_STATUSES).safeParse(status).success) return fail("Invalid request.");
  const expires = offerExpiresLocal ? localInputToIso(offerExpiresLocal) : null;
  const supabase = await createClient();
  const { error } = await supabase.rpc("organizer_update_volunteer_application", {
    p_application: applicationId,
    p_status: status,
    p_message: message?.trim().slice(0, 2000) || undefined,
    p_offer_expires_at: status === "offered" && expires ? expires : undefined,
  });
  if (error) return fail(userMessage(error, "We could not update the application."));
  refresh(ctx);
  return ok(null, status === "offered" ? "Offer sent. The applicant has been notified." : "Application updated. The applicant has been notified.");
}

export async function addApplicationNote(applicationId: string, ctx: Ctx, body?: string): Promise<ActionResult<null>> {
  if (!(await getSessionUser())) return fail(SIGN_IN);
  const text = body?.trim() ?? "";
  if (!uuid.safeParse(applicationId).success || text.length < 1 || text.length > 2000) return fail("Write a note of up to 2,000 characters.");
  const supabase = await createClient();
  const { error } = await supabase.from("volunteer_application_notes").insert({ application_id: applicationId, body: text });
  if (error) return fail(userMessage(error, "We could not save the note."));
  refresh(ctx);
  return ok(null, "Note added. Only your organising team can see it.");
}

export async function setRoleStatus(roleId: string, status: "open" | "paused" | "closed", ctx: Ctx): Promise<ActionResult<null>> {
  if (!(await getSessionUser())) return fail(SIGN_IN);
  if (!uuid.safeParse(roleId).success || !z.enum(["open", "paused", "closed"]).safeParse(status).success) return fail("Invalid request.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("volunteer_roles").update({ status }).eq("id", roleId).select("id").maybeSingle();
  if (error) return fail(userMessage(error));
  if (!data) return fail("You do not have permission to change this role.");
  refresh(ctx);
  return ok(null, status === "open" ? "Role reopened for applications." : status === "paused" ? "Applications paused." : "Role closed.");
}

export async function saveRoleForm(roleId: string, fields: FormField[], ctx: Ctx): Promise<ActionResult<null>> {
  if (!(await getSessionUser())) return fail(SIGN_IN);
  if (!uuid.safeParse(roleId).success) return fail("Invalid role.");
  const parsed = formFieldsSchema.safeParse(fields);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the questions.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_form", { p_event: null as unknown as string, p_role: roleId, p_fields: parsed.data as Json });
  if (error) return fail(userMessage(error, "We could not save the form."));
  refresh(ctx);
  return ok(null, "Application form saved.");
}

const shiftSchema = z
  .object({
    roleId: uuid,
    title: z.string().trim().min(2, "Give the shift a name").max(120),
    startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a start time"),
    endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose an end time"),
    location: z.string().trim().max(200).optional(),
    instructions: z.string().trim().max(2000).optional(),
    capacity: z.union([z.literal(""), z.coerce.number().int().min(1, "Capacity must be at least 1").max(1000)]).optional(),
  })
  .refine((s) => s.endsAt > s.startsAt, { message: "The shift must end after it starts", path: ["endsAt"] });

export async function createShift(input: z.input<typeof shiftSchema>, ctx: Ctx): Promise<ActionResult<null>> {
  if (!(await getSessionUser())) return fail(SIGN_IN);
  const parsed = shiftSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the shift details.", z.flattenError(parsed.error).fieldErrors);
  const s = parsed.data;
  const supabase = await createClient();
  // event_id is derived from the role by the shift_event_guard trigger and is
  // deliberately not client-writable, so it is omitted here.
  const row = {
    role_id: s.roleId,
    title: s.title,
    starts_at: localInputToIso(s.startsAt)!,
    ends_at: localInputToIso(s.endsAt)!,
    location: s.location || null,
    instructions: s.instructions || null,
    capacity: s.capacity === "" || s.capacity === undefined ? null : s.capacity,
  } as TablesInsert<"volunteer_shifts">;
  const { error } = await supabase.from("volunteer_shifts").insert(row);
  if (error) return fail(userMessage(error, "We could not create the shift."));
  refresh(ctx);
  return ok(null, "Shift added.");
}

export async function deleteShift(shiftId: string, ctx: Ctx): Promise<ActionResult<null>> {
  if (!(await getSessionUser())) return fail(SIGN_IN);
  if (!uuid.safeParse(shiftId).success) return fail("Invalid shift.");
  const supabase = await createClient();
  const { error, count } = await supabase.from("volunteer_shifts").delete({ count: "exact" }).eq("id", shiftId);
  if (error) return fail(userMessage(error));
  if (!count) return fail("You do not have permission to delete this shift.");
  refresh(ctx);
  return ok(null, "Shift deleted.");
}

export async function assignShift(shiftId: string, applicationId: string, assign: boolean, ctx: Ctx): Promise<ActionResult<null>> {
  if (!(await getSessionUser())) return fail(SIGN_IN);
  if (!uuid.safeParse(shiftId).success || !uuid.safeParse(applicationId).success) return fail("Invalid request.");
  const supabase = await createClient();
  const { error } = assign
    ? await supabase.from("volunteer_shift_assignments").insert({ shift_id: shiftId, application_id: applicationId })
    : await supabase.from("volunteer_shift_assignments").delete().eq("shift_id", shiftId).eq("application_id", applicationId);
  if (error) {
    if (error.code === "23505") return fail("Already assigned to this shift.");
    return fail(userMessage(error, "We could not update the shift."));
  }
  refresh(ctx);
  return ok(null, assign ? "Assigned. The volunteer has been notified." : "Removed from the shift.");
}

export async function issueCertificate(applicationId: string, ctx: Ctx): Promise<ActionResult<{ code: string }>> {
  if (!(await getSessionUser())) return fail(SIGN_IN);
  if (!uuid.safeParse(applicationId).success) return fail("Invalid application.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("issue_volunteer_certificate", { p_application: applicationId });
  if (error) return fail(userMessage(error, "We could not issue the certificate."));
  refresh(ctx);
  return ok({ code: data }, `Certificate ${data} issued.`);
}

export async function revokeCertificate(certificateId: string, ctx: Ctx, reason?: string): Promise<ActionResult<null>> {
  if (!(await getSessionUser())) return fail(SIGN_IN);
  if (!uuid.safeParse(certificateId).success || !reason?.trim()) return fail("Give a reason for revoking.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_certificate", { p_certificate: certificateId, p_reason: reason.trim().slice(0, 500) });
  if (error) return fail(userMessage(error));
  refresh(ctx);
  return ok(null, "Certificate revoked. Its verification page now shows it as invalid.");
}
