"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { fail, ok, userMessage, type ActionResult } from "@/lib/errors";
import { answersSchema, cleanAnswers, parseStoredFields } from "@/lib/forms/schema";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

const SIGN_IN = "Please log in to continue.";

const teamMemberSchema = z.object({
  name: z.string().trim().min(2, "Enter each member's name").max(120),
  email: z.string().trim().email("Enter a valid email for each member").max(200),
});

const registerInput = z.object({
  eventId: z.string().uuid(),
  answers: z.record(z.string(), z.unknown()),
  teamName: z.string().trim().max(120).optional(),
  teamMembers: z.array(teamMemberSchema).max(19).optional(),
});

export async function registerForEvent(
  input: z.infer<typeof registerInput>,
): Promise<ActionResult<{ status: string; reference: string }>> {
  const user = await getSessionUser();
  if (!user) return fail(SIGN_IN);
  const parsed = registerInput.safeParse(input);
  if (!parsed.success) return fail("Please check the form and try again.");

  const supabase = await createClient();
  // Validate against the stored form (the database validates again).
  const { data: form } = await supabase
    .from("form_versions")
    .select("fields")
    .eq("event_id", parsed.data.eventId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const fields = parseStoredFields(form?.fields ?? []);
  const answers = answersSchema(fields).safeParse(parsed.data.answers);
  if (!answers.success) {
    return fail("Some answers need attention.", z.flattenError(answers.error).fieldErrors as Record<string, string[]>);
  }

  const { data, error } = await supabase.rpc("register_for_event", {
    p_event: parsed.data.eventId,
    p_answers: cleanAnswers(fields, answers.data) as Json,
    p_team_name: parsed.data.teamName || undefined,
    p_team_members: (parsed.data.teamMembers ?? []) as Json,
  });
  if (error || !data?.[0]) return fail(userMessage(error, "We could not complete your registration. Please try again."));

  revalidatePath("/dashboard", "layout");
  revalidatePath(`/events`, "layout");
  return ok({ status: data[0].registration_status, reference: data[0].reference });
}

const applyInput = z.object({
  roleId: z.string().uuid(),
  answers: z.record(z.string(), z.unknown()),
  portfolioUrl: z.union([z.string().trim().regex(/^https?:\/\/\S+$/i, "Link must start with https://").max(500), z.literal("")]).optional(),
});

export async function applyForRole(input: z.infer<typeof applyInput>): Promise<ActionResult<{ reference: string }>> {
  const user = await getSessionUser();
  if (!user) return fail(SIGN_IN);
  const parsed = applyInput.safeParse(input);
  if (!parsed.success) return fail("Please check the form and try again.", z.flattenError(parsed.error).fieldErrors);

  const supabase = await createClient();
  const { data: form } = await supabase
    .from("form_versions")
    .select("fields")
    .eq("volunteer_role_id", parsed.data.roleId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const fields = parseStoredFields(form?.fields ?? []);
  const answers = answersSchema(fields).safeParse(parsed.data.answers);
  if (!answers.success) {
    return fail("Some answers need attention.", z.flattenError(answers.error).fieldErrors as Record<string, string[]>);
  }

  const { data, error } = await supabase.rpc("apply_for_volunteer_role", {
    p_role: parsed.data.roleId,
    p_answers: cleanAnswers(fields, answers.data) as Json,
    p_portfolio_url: parsed.data.portfolioUrl || undefined,
  });
  if (error || !data?.[0]) return fail(userMessage(error, "We could not submit your application. Please try again."));

  revalidatePath("/dashboard", "layout");
  return ok({ reference: data[0].reference });
}

export async function toggleSavedEvent(eventId: string, save: boolean): Promise<ActionResult<{ saved: boolean }>> {
  const user = await getSessionUser();
  if (!user) return fail(SIGN_IN);
  if (!z.string().uuid().safeParse(eventId).success) return fail("Invalid event.");
  const supabase = await createClient();
  const { error } = save
    ? await supabase.from("saved_events").upsert({ user_id: user.id, event_id: eventId }, { onConflict: "user_id,event_id", ignoreDuplicates: true })
    : await supabase.from("saved_events").delete().eq("user_id", user.id).eq("event_id", eventId);
  if (error) return fail(userMessage(error));
  revalidatePath("/dashboard/saved");
  return ok({ saved: save });
}

export async function toggleSavedRole(roleId: string, save: boolean): Promise<ActionResult<{ saved: boolean }>> {
  const user = await getSessionUser();
  if (!user) return fail(SIGN_IN);
  if (!z.string().uuid().safeParse(roleId).success) return fail("Invalid role.");
  const supabase = await createClient();
  const { error } = save
    ? await supabase.from("saved_opportunities").upsert({ user_id: user.id, role_id: roleId }, { onConflict: "user_id,role_id", ignoreDuplicates: true })
    : await supabase.from("saved_opportunities").delete().eq("user_id", user.id).eq("role_id", roleId);
  if (error) return fail(userMessage(error));
  revalidatePath("/dashboard/saved");
  return ok({ saved: save });
}

const reportInput = z.object({
  target: z.enum(["event", "society"]),
  targetId: z.string().uuid(),
  reason: z.enum(["fraudulent_event", "impersonation", "misleading_fees", "spam", "inappropriate_content", "misuse_of_data", "other"]),
  details: z.string().trim().max(2000).optional(),
});

export async function submitReport(input: z.infer<typeof reportInput>): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user) return fail(SIGN_IN);
  const parsed = reportInput.safeParse(input);
  if (!parsed.success) return fail("Please choose a reason.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_report", {
    p_target: parsed.data.target,
    p_target_id: parsed.data.targetId,
    p_reason: parsed.data.reason,
    p_details: parsed.data.details || undefined,
  });
  if (error) return fail(userMessage(error));
  return ok(null, "Thank you. Our team will review this report.");
}
