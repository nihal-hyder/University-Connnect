"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { fail, ok, userMessage, type ActionResult } from "@/lib/errors";
import { isPathInFolder } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

const SIGN_IN = "Please log in to continue.";
const uuid = z.string().uuid();
const blank = <T extends z.ZodTypeAny>(s: T) => z.union([s, z.literal("")]).optional().transform((v) => (v === "" || v === undefined ? null : v));
const httpUrl = z.string().trim().max(300).regex(/^https?:\/\/\S+$/i, "Links must start with https://");
const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(200);

// ---------------------------------------------------------------------------
// Society verification applications
// ---------------------------------------------------------------------------
const applicationSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(3, "Enter the society's official name").max(140),
  universityId: uuid,
  campusId: blank(uuid),
  departmentId: blank(uuid),
  scopeLabel: blank(z.string().trim().max(120)),
  categoryId: blank(z.coerce.number().int().positive()),
  description: blank(z.string().trim().max(3000)),
  logoPath: z.string().max(300).nullable().optional(),
  websiteUrl: blank(httpUrl),
  socialLinks: z.array(httpUrl).max(6).default([]),
  facultyAdvisorName: blank(z.string().trim().max(120)),
  facultyAdvisorTitle: blank(z.string().trim().max(120)),
  facultyAdvisorEmail: blank(email),
  presidentName: blank(z.string().trim().max(120)),
  presidentEmail: blank(email),
  contactEmail: blank(email),
  contactPhone: blank(z.string().trim().max(30).regex(/^[+0-9 ()-]{7,30}$/, "Enter a valid phone number")),
  publicContactEmail: blank(email),
  teamSize: blank(z.coerce.number().int().min(1).max(5000)),
  recognitionDetails: blank(z.string().trim().max(2000)),
  evidencePath: z.string().max(300).nullable().optional(),
  applicantRole: blank(z.string().trim().max(120)),
});

export type SocietyApplicationInput = z.input<typeof applicationSchema>;

export async function saveSocietyApplication(
  input: SocietyApplicationInput,
  submit: boolean,
): Promise<ActionResult<{ id: string; status: string }>> {
  const user = await getSessionUser();
  if (!user) return fail(SIGN_IN);
  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) return fail("Please check the highlighted fields.", z.flattenError(parsed.error).fieldErrors);
  const a = parsed.data;
  if (!isPathInFolder(a.logoPath, `users/${user.id}`)) return fail("That logo cannot be used.");
  if (!isPathInFolder(a.evidencePath, `applications/${user.id}`)) return fail("That document cannot be used.");

  const row = {
    name: a.name,
    university_id: a.universityId,
    campus_id: a.campusId,
    department_id: a.departmentId,
    scope_label: a.scopeLabel,
    category_id: a.categoryId,
    description: a.description,
    logo_path: a.logoPath ?? null,
    website_url: a.websiteUrl,
    social_links: a.socialLinks,
    faculty_advisor_name: a.facultyAdvisorName,
    faculty_advisor_title: a.facultyAdvisorTitle,
    faculty_advisor_email: a.facultyAdvisorEmail,
    president_name: a.presidentName,
    president_email: a.presidentEmail,
    contact_email: a.contactEmail,
    contact_phone: a.contactPhone,
    public_contact_email: a.publicContactEmail,
    team_size: a.teamSize,
    recognition_details: a.recognitionDetails,
    evidence_path: a.evidencePath ?? null,
    applicant_role: a.applicantRole,
  };

  const supabase = await createClient();
  let id = a.id;
  if (id) {
    // RLS only allows editing your own application while it is a draft or
    // when more information was requested.
    const { data, error } = await supabase.from("society_applications").update(row).eq("id", id).select("id").maybeSingle();
    if (error) return fail(userMessage(error, "We could not save the application."));
    if (!data) return fail("This application can no longer be edited.");
  } else {
    const { data, error } = await supabase.from("society_applications").insert({ ...row, applicant_id: user.id }).select("id").single();
    if (error) return fail(userMessage(error, "We could not save the application."));
    id = data.id;
  }

  let status = "draft";
  if (submit) {
    const { data, error } = await supabase.rpc("submit_society_application", { p_application: id });
    if (error) {
      revalidatePath("/societies/apply");
      return { ok: false, error: userMessage(error, "We could not submit the application.") };
    }
    status = data;
  }
  revalidatePath("/societies/apply");
  revalidatePath("/dashboard/societies");
  return ok({ id, status }, submit ? "Application submitted for review." : "Draft saved.");
}

export async function deleteSocietyApplication(id: string): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user) return fail(SIGN_IN);
  if (!uuid.safeParse(id).success) return fail("Invalid application.");
  const supabase = await createClient();
  const { error, count } = await supabase.from("society_applications").delete({ count: "exact" }).eq("id", id).eq("status", "draft");
  if (error) return fail(userMessage(error));
  if (!count) return fail("Only drafts can be deleted.");
  revalidatePath("/dashboard/societies");
  revalidatePath("/societies/apply");
  return ok(null, "Draft deleted.");
}

// ---------------------------------------------------------------------------
// Society profile (approved societies)
// ---------------------------------------------------------------------------
const profileSchema = z.object({
  societyId: uuid,
  scopeLabel: blank(z.string().trim().max(120)),
  categoryId: blank(z.coerce.number().int().positive()),
  description: blank(z.string().trim().max(3000)),
  logoPath: z.string().max(300).nullable().optional(),
  websiteUrl: blank(httpUrl),
  socialLinks: z.array(httpUrl).max(6).default([]),
  publicContactEmail: blank(email),
  campusId: blank(uuid),
  departmentId: blank(uuid),
});

export async function updateSocietyProfile(input: z.input<typeof profileSchema>): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user) return fail(SIGN_IN);
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail("Please check the highlighted fields.", z.flattenError(parsed.error).fieldErrors);
  const p = parsed.data;
  const supabase = await createClient();
  // New uploads must be in the society's folder; the existing logo (which may
  // come from the verification application) can be kept as is.
  const { data: current } = await supabase.from("societies").select("logo_path").eq("id", p.societyId).maybeSingle();
  if (p.logoPath !== current?.logo_path && !isPathInFolder(p.logoPath, `societies/${p.societyId}`)) return fail("That logo cannot be used.");
  const { data, error } = await supabase
    .from("societies")
    .update({
      scope_label: p.scopeLabel,
      category_id: p.categoryId,
      description: p.description,
      logo_path: p.logoPath ?? null,
      website_url: p.websiteUrl,
      social_links: p.socialLinks,
      public_contact_email: p.publicContactEmail,
      campus_id: p.campusId,
      department_id: p.departmentId,
    })
    .eq("id", p.societyId)
    .select("slug")
    .maybeSingle();
  if (error) return fail(userMessage(error, "We could not save the profile."));
  if (!data) return fail("You do not have permission to edit this society.");
  revalidatePath(`/manage/${data.slug}`, "layout");
  revalidatePath(`/societies/${data.slug}`);
  return ok(null, "Society profile saved.");
}

// ---------------------------------------------------------------------------
// Members & invitations. Every rule (who can invite which role, last owner,
// expiry) is enforced inside the SQL functions.
// ---------------------------------------------------------------------------
const roleEnum = z.enum(["admin", "event_manager", "volunteer_coordinator", "analyst"]);

async function rpcResult(promise: PromiseLike<{ error: { code?: string; message?: string } | null }>, slug: string | null, message: string) {
  const { error } = await promise;
  if (error) return fail(userMessage(error));
  if (slug) revalidatePath(`/manage/${slug}`, "layout");
  revalidatePath("/dashboard", "layout");
  return ok(null, message);
}

export async function inviteMember(input: { societyId: string; slug: string; email: string; role: string }): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user) return fail(SIGN_IN);
  const parsed = z.object({ societyId: uuid, slug: z.string().max(120), email, role: roleEnum }).safeParse(input);
  if (!parsed.success) return fail("Enter a valid email and choose a role.", z.flattenError(parsed.error).fieldErrors);
  const supabase = await createClient();
  return rpcResult(
    supabase.rpc("invite_society_member", { p_society: parsed.data.societyId, p_email: parsed.data.email, p_role: parsed.data.role }),
    parsed.data.slug,
    `Invitation sent to ${parsed.data.email}. It expires in 7 days.`,
  );
}

export async function revokeInvitation(id: string, slug: string): Promise<ActionResult<null>> {
  if (!(await getSessionUser())) return fail(SIGN_IN);
  if (!uuid.safeParse(id).success) return fail("Invalid invitation.");
  const supabase = await createClient();
  return rpcResult(supabase.rpc("revoke_society_invitation", { p_invitation: id }), slug, "Invitation revoked.");
}

export async function respondToInvitation(id: string, accept: boolean): Promise<ActionResult<null>> {
  if (!(await getSessionUser())) return fail(SIGN_IN);
  if (!uuid.safeParse(id).success) return fail("Invalid invitation.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_society_invitation", { p_invitation: id, p_accept: accept });
  if (error) return fail(userMessage(error));
  revalidatePath("/", "layout");
  return ok(null, accept ? "You joined the society." : "Invitation declined.");
}

export async function updateMemberRole(input: { membershipId: string; slug: string; role: string; title?: string }): Promise<ActionResult<null>> {
  if (!(await getSessionUser())) return fail(SIGN_IN);
  const parsed = z
    .object({ membershipId: uuid, slug: z.string().max(120), role: roleEnum, title: z.string().trim().max(80).optional() })
    .safeParse(input);
  if (!parsed.success) return fail("Choose a valid role.");
  const supabase = await createClient();
  return rpcResult(
    supabase.rpc("update_society_member_role", { p_membership: parsed.data.membershipId, p_role: parsed.data.role, p_title: parsed.data.title || undefined }),
    parsed.data.slug,
    "Role updated.",
  );
}

export async function removeMember(membershipId: string, slug: string): Promise<ActionResult<null>> {
  if (!(await getSessionUser())) return fail(SIGN_IN);
  if (!uuid.safeParse(membershipId).success) return fail("Invalid member.");
  const supabase = await createClient();
  return rpcResult(supabase.rpc("remove_society_member", { p_membership: membershipId }), slug, "Member removed.");
}

export async function transferOwnership(input: { societyId: string; slug: string; newOwnerId: string; confirm: string }): Promise<ActionResult<null>> {
  if (!(await getSessionUser())) return fail(SIGN_IN);
  const parsed = z.object({ societyId: uuid, slug: z.string().max(120), newOwnerId: uuid, confirm: z.string() }).safeParse(input);
  if (!parsed.success) return fail("Choose the new owner.");
  if (parsed.data.confirm.trim().toLowerCase() !== "transfer") return fail('Type "transfer" to confirm.');
  const supabase = await createClient();
  return rpcResult(
    supabase.rpc("transfer_society_ownership", { p_society: parsed.data.societyId, p_new_owner: parsed.data.newOwnerId }),
    parsed.data.slug,
    "Ownership transferred. You are now an administrator of this society.",
  );
}
