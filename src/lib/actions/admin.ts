"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer } from "@/lib/auth/session";
import { fail, ok, userMessage, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { parseDomains } from "@/lib/university-email";

/**
 * Every admin action is re-authorised by the database (private.is_platform_admin
 * inside each function / RLS policy). The isAdmin check here only gives a
 * clearer message; it is not the security boundary.
 */
async function adminGuard() {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) return null;
  return viewer;
}

const uuid = z.string().uuid();
const NOT_ADMIN = "Only platform administrators can do that.";

function done(message: string): ActionResult<null> {
  revalidatePath("/admin", "layout");
  return ok(null, message);
}

export async function reviewSocietyApplication(id: string, decision: "under_review" | "info_requested" | "approved" | "rejected", message?: string): Promise<ActionResult<null>> {
  if (!(await adminGuard())) return fail(NOT_ADMIN);
  if (!uuid.safeParse(id).success || !z.enum(["under_review", "info_requested", "approved", "rejected"]).safeParse(decision).success) return fail("Invalid request.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_society_application", { p_application: id, p_decision: decision, p_message: message?.trim().slice(0, 2000) || undefined });
  if (error) return fail(userMessage(error));
  revalidatePath("/societies");
  return done(
    decision === "approved"
      ? "Approved. The society is live and the applicant is its owner."
      : decision === "info_requested"
        ? "Request sent to the applicant."
        : decision === "rejected"
          ? "Application rejected. The applicant was notified."
          : "Marked as under review.",
  );
}

export async function reviewEvent(id: string, decision: "published" | "changes_requested" | "rejected", note?: string): Promise<ActionResult<null>> {
  if (!(await adminGuard())) return fail(NOT_ADMIN);
  if (!uuid.safeParse(id).success || !z.enum(["published", "changes_requested", "rejected"]).safeParse(decision).success) return fail("Invalid request.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_event", { p_event: id, p_decision: decision, p_note: note?.trim().slice(0, 2000) || undefined });
  if (error) return fail(userMessage(error));
  revalidatePath("/explore");
  revalidatePath("/");
  return done(decision === "published" ? "Event approved and published." : decision === "changes_requested" ? "Changes requested from the organisers." : "Event rejected.");
}

export async function setSocietyStatus(id: string, status: "active" | "suspended", note?: string): Promise<ActionResult<null>> {
  if (!(await adminGuard())) return fail(NOT_ADMIN);
  if (!uuid.safeParse(id).success) return fail("Invalid society.");
  if (!note || note.trim().length < 5) return fail("Add a note explaining the decision.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_society_status", { p_society: id, p_status: status, p_note: note.trim().slice(0, 1000) });
  if (error) return fail(userMessage(error));
  revalidatePath("/societies", "layout");
  return done(status === "suspended" ? "Society suspended. Its events are hidden." : "Society reinstated.");
}

export async function setSocietyReviewPolicy(id: string, requiresReview: boolean): Promise<ActionResult<null>> {
  if (!(await adminGuard())) return fail(NOT_ADMIN);
  if (!uuid.safeParse(id).success) return fail("Invalid society.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_society_review_policy", { p_society: id, p_requires_review: requiresReview });
  if (error) return fail(userMessage(error));
  return done(requiresReview ? "New events from this society will be reviewed." : "This society can now publish directly.");
}

export async function updateReport(id: string, status: "reviewing" | "resolved" | "dismissed", note?: string): Promise<ActionResult<null>> {
  if (!(await adminGuard())) return fail(NOT_ADMIN);
  if (!uuid.safeParse(id).success || !z.enum(["reviewing", "resolved", "dismissed"]).safeParse(status).success) return fail("Invalid request.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_report", { p_report: id, p_status: status, p_note: note?.trim().slice(0, 2000) || undefined });
  if (error) return fail(userMessage(error));
  return done("Report updated.");
}

export async function setMaintenance(enabled: boolean, message?: string): Promise<ActionResult<null>> {
  if (!(await adminGuard())) return fail(NOT_ADMIN);
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_maintenance", { p_enabled: enabled, p_message: message?.trim().slice(0, 500) || undefined });
  if (error) return fail(userMessage(error));
  return done(
    enabled
      ? "Maintenance mode is on. Visitors now see the maintenance page; administrators can still use the site."
      : "The site is back online for everyone.",
  );
}

// --- Directory (universities, campuses, departments, categories) -----------
const slugify = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

const directorySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("university"),
    name: z.string().trim().min(3).max(160),
    shortName: z.string().trim().max(30).optional(),
    cityId: z.coerce.number().int().positive().optional(),
    websiteUrl: z.union([z.literal(""), z.string().trim().regex(/^https:\/\/\S+$/i, "Website must start with https://")]).optional(),
  }),
  z.object({ kind: z.literal("campus"), universityId: uuid, name: z.string().trim().min(2).max(120), cityId: z.coerce.number().int().positive().optional() }),
  z.object({ kind: z.literal("department"), universityId: uuid, name: z.string().trim().min(2).max(120) }),
  z.object({ kind: z.literal("category"), name: z.string().trim().min(2).max(60), description: z.string().trim().max(240).optional() }),
]);

export async function addDirectoryEntry(input: z.input<typeof directorySchema>): Promise<ActionResult<null>> {
  if (!(await adminGuard())) return fail(NOT_ADMIN);
  const parsed = directorySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the fields.");
  const d = parsed.data;
  const supabase = await createClient();
  const { error } =
    d.kind === "university"
      ? await supabase.from("universities").insert({ name: d.name, short_name: d.shortName || null, slug: slugify(d.shortName || d.name), city_id: d.cityId ?? null, website_url: d.websiteUrl || null })
      : d.kind === "campus"
        ? await supabase.from("campuses").insert({ university_id: d.universityId, name: d.name, city_id: d.cityId ?? null })
        : d.kind === "department"
          ? await supabase.from("departments").insert({ university_id: d.universityId, name: d.name })
          : await supabase.from("event_categories").insert({ name: d.name, slug: slugify(d.name), description: d.description || null });
  if (error) {
    if (error.code === "23505") return fail("An entry with this name already exists. Use the existing one to avoid duplicates in filters.");
    return fail(userMessage(error));
  }
  revalidatePath("/", "layout");
  return done("Added.");
}

export async function setDirectoryActive(kind: "university" | "campus" | "department" | "category", id: string, active: boolean): Promise<ActionResult<null>> {
  if (!(await adminGuard())) return fail(NOT_ADMIN);
  const supabase = await createClient();
  const table = kind === "university" ? "universities" : kind === "campus" ? "campuses" : kind === "department" ? "departments" : "event_categories";
  const { error } =
    table === "event_categories"
      ? await supabase.from("event_categories").update({ is_active: active }).eq("id", Number(id))
      : await supabase.from(table).update({ is_active: active }).eq("id", id);
  if (error) return fail(userMessage(error));
  revalidatePath("/", "layout");
  return done(active ? "Shown in lists again." : "Hidden from lists. Existing records keep it.");
}

export async function setUniversityDomains(universityId: string, input: string): Promise<ActionResult<null>> {
  if (!(await adminGuard())) return fail(NOT_ADMIN);
  if (!uuid.safeParse(universityId).success) return fail("Invalid university.");
  const domains = parseDomains(input);
  if (!domains) return fail("Enter up to 10 domains like nust.edu.pk, separated by commas.");
  const supabase = await createClient();
  const { error } = await supabase.from("universities").update({ email_domains: domains }).eq("id", universityId);
  if (error) return fail(userMessage(error));
  return done(domains.length ? `Email domains saved: ${domains.join(", ")}.` : "Email domains cleared.");
}
