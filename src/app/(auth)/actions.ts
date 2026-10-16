"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { passwordSchema } from "@/lib/auth/password";
import { safeNextPath } from "@/lib/auth/safe-redirect";
import { publicEnv } from "@/lib/env/public";
import { fail, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(200);

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(120),
  email: emailSchema,
  password: passwordSchema,
});

export async function signUp(input: z.infer<typeof signupSchema>): Promise<ActionResult<{ email: string }>> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return fail("Please check the form.", z.flattenError(parsed.error).fieldErrors);
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Only the display name is sent as metadata. Roles are never accepted
      // from sign-up; the database ignores anything else here.
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${publicEnv.siteUrl}/auth/confirm?next=/onboarding`,
    },
  });
  if (error) {
    if (error.code === "weak_password") return fail("Choose a stronger password.", { password: [error.message] });
    if (error.code === "over_email_send_rate_limit" || error.status === 429) {
      return fail("Too many attempts. Please wait a few minutes and try again.");
    }
    if (error.code === "signup_disabled") return fail("Sign-ups are temporarily closed.");
    // Do not reveal whether the email is already registered.
    if (error.code !== "user_already_exists" && error.code !== "email_exists") {
      return fail("We could not create your account. Please try again.");
    }
  }
  // Same response whether or not an account already exists (prevents email enumeration).
  return { ok: true, data: { email: parsed.data.email } };
}

const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password").max(72), next: z.string().optional() });

export async function signIn(input: z.infer<typeof loginSchema>): Promise<ActionResult<null> | never> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return fail("Enter your email and password.", z.flattenError(parsed.error).fieldErrors);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return fail("Please verify your email first. Check your inbox for the link, or resend it below.", { email: ["unconfirmed"] });
    }
    if (error.status === 429) return fail("Too many attempts. Please wait a few minutes and try again.");
    return fail("That email and password combination is not correct.");
  }
  redirect(safeNextPath(parsed.data.next, "/dashboard"));
}

export async function resendVerification(email: string): Promise<ActionResult<null>> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return fail("Enter a valid email address.");
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
    options: { emailRedirectTo: `${publicEnv.siteUrl}/auth/confirm?next=/onboarding` },
  });
  if (error?.status === 429) return fail("Please wait a minute before requesting another email.");
  return { ok: true, data: null, message: "If that address has an unverified account, we sent a new link." };
}

export async function requestPasswordReset(email: string): Promise<ActionResult<null>> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return fail("Enter a valid email address.");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${publicEnv.siteUrl}/auth/confirm?type=recovery&next=/reset-password`,
  });
  if (error?.status === 429) return fail("Please wait a minute before requesting another email.");
  return { ok: true, data: null };
}

export async function updatePassword(password: string): Promise<ActionResult<null>> {
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Choose a stronger password.");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return fail("Your reset link has expired. Request a new one.");
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    if (error.code === "same_password") return fail("Choose a password you have not used before.");
    return fail("We could not update your password. Request a new reset link and try again.");
  }
  return { ok: true, data: null };
}
