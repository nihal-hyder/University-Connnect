"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { fail, ok, userMessage, type ActionResult } from "@/lib/errors";
import { isPathInFolder } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const SIGN_IN = "Please log in to continue.";
const uuid = z.string().uuid();
const optionalUuid = z.union([uuid, z.literal(""), z.null()]).optional().transform((v) => v || null);

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(120),
  universityId: optionalUuid,
  campusId: optionalUuid,
  departmentId: optionalUuid,
  program: z.string().trim().max(120).optional().transform((v) => v || null),
  academicLevel: z
    .union([z.enum(["undergraduate", "masters", "phd", "diploma", "other"]), z.literal("")])
    .optional()
    .transform((v) => v || null),
  graduationYear: z
    .union([z.coerce.number().int().min(1980, "Enter a valid year").max(2100, "Enter a valid year"), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  cityId: z
    .union([z.coerce.number().int().positive(), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  bio: z.string().trim().max(600, "Keep your bio under 600 characters").optional().transform((v) => v || null),
  avatarPath: z.string().max(300).nullable().optional(),
  interests: z.array(z.coerce.number().int().positive()).max(20, "Choose up to 20 interests").default([]),
  completeOnboarding: z.boolean().optional(),
});

export type ProfileInput = z.input<typeof profileSchema>;

export async function saveProfile(input: ProfileInput): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user) return fail(SIGN_IN);
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail("Please check the highlighted fields.", z.flattenError(parsed.error).fieldErrors);
  const p = parsed.data;
  if (!isPathInFolder(p.avatarPath, `users/${user.id}`)) return fail("That image cannot be used.");

  const supabase = await createClient();

  // Campus and department must belong to the chosen university, so filters
  // never see mismatched combinations.
  if (p.campusId || p.departmentId) {
    if (!p.universityId) return fail("Choose your university first.", { universityId: ["Choose your university"] });
    const [campus, dept] = await Promise.all([
      p.campusId ? supabase.from("campuses").select("university_id").eq("id", p.campusId).maybeSingle() : null,
      p.departmentId ? supabase.from("departments").select("university_id").eq("id", p.departmentId).maybeSingle() : null,
    ]);
    if (campus && campus.data?.university_id !== p.universityId) return fail("That campus is not part of the selected university.", { campusId: ["Choose a campus of your university"] });
    if (dept && dept.data?.university_id !== p.universityId) return fail("That department is not part of the selected university.", { departmentId: ["Choose a department of your university"] });
  }

  const { data: current } = await supabase.from("profiles").select("onboarded_at").eq("id", user.id).single();

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: p.fullName,
      university_id: p.universityId,
      campus_id: p.campusId,
      department_id: p.departmentId,
      program: p.program,
      academic_level: p.academicLevel,
      graduation_year: p.graduationYear,
      city_id: p.cityId,
      bio: p.bio,
      avatar_path: p.avatarPath ?? null,
      ...(p.completeOnboarding && !current?.onboarded_at ? { onboarded_at: new Date().toISOString() } : {}),
    })
    .eq("id", user.id);
  if (error) return fail(userMessage(error, "We could not save your profile."));

  // Replace interests with the submitted set.
  const { data: existing } = await supabase.from("profile_interests").select("category_id").eq("profile_id", user.id);
  const have = new Set((existing ?? []).map((r) => r.category_id));
  const want = new Set(p.interests);
  const toRemove = [...have].filter((id) => !want.has(id));
  const toAdd = [...want].filter((id) => !have.has(id));
  if (toRemove.length) {
    const { error: delError } = await supabase.from("profile_interests").delete().eq("profile_id", user.id).in("category_id", toRemove);
    if (delError) return fail(userMessage(delError, "Your profile was saved, but interests could not be updated."));
  }
  if (toAdd.length) {
    const { error: insError } = await supabase.from("profile_interests").insert(toAdd.map((category_id) => ({ profile_id: user.id, category_id })));
    if (insError) return fail(userMessage(insError, "Your profile was saved, but interests could not be updated."));
  }

  revalidatePath("/", "layout");
  return ok(null, "Profile saved.");
}

const preferencesSchema = z.object({
  emailReminders: z.boolean(),
  emailRecommendations: z.boolean(),
  emailSocietyUpdates: z.boolean(),
});

export async function savePreferences(input: z.infer<typeof preferencesSchema>): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user) return fail(SIGN_IN);
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid preferences.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_preferences")
    .update({
      email_reminders: parsed.data.emailReminders,
      email_recommendations: parsed.data.emailRecommendations,
      email_society_updates: parsed.data.emailSocietyUpdates,
    })
    .eq("user_id", user.id);
  if (error) return fail(userMessage(error, "We could not save your preferences."));
  revalidatePath("/dashboard/settings");
  return ok(null, "Preferences saved.");
}

export async function markNotificationsRead(ids?: string[]): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user) return fail(SIGN_IN);
  const parsed = z.array(uuid).max(200).optional().safeParse(ids);
  if (!parsed.success) return fail("Invalid request.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_notifications_read", { p_ids: parsed.data });
  if (error) return fail(userMessage(error));
  revalidatePath("/", "layout");
  return ok(null);
}

/**
 * Permanently deletes the account. Safeguards:
 *  - the user must type their email address to confirm;
 *  - society owners must transfer ownership first (a society always needs an
 *    accountable owner);
 *  - issued certificates keep their snapshot names (user_id is set null) so
 *    public verification still works; everything personal cascades.
 */
export async function deleteAccount(confirmEmail: string): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user) return fail(SIGN_IN);
  if (!user.email || confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
    return fail("Type your account email exactly to confirm.");
  }
  const supabase = await createClient();
  const { data: owned } = await supabase.from("society_memberships").select("id").eq("user_id", user.id).eq("role", "owner");
  if (owned?.length) {
    return fail("You own a society. Transfer ownership to another member before deleting your account.");
  }
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return fail("Account deletion is not configured on this server. Contact support.");
  }
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return fail("We could not delete your account. Please contact support.");
  await supabase.auth.signOut();
  redirect("/?account=deleted");
}
