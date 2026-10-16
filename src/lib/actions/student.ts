"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { fail, ok, userMessage, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

const SIGN_IN = "Please log in to continue.";
const uuid = z.string().uuid();

function refresh() {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/events", "layout");
}

export async function cancelMyRegistration(registrationId: string, reason?: string): Promise<ActionResult<null>> {
  if (!(await getSessionUser())) return fail(SIGN_IN);
  if (!uuid.safeParse(registrationId).success) return fail("Invalid registration.");
  const supabase = await createClient();
  // The function checks ownership, event state and promotes the waitlist.
  const { error } = await supabase.rpc("cancel_registration", {
    p_registration: registrationId,
    p_reason: reason?.slice(0, 500) || undefined,
  });
  if (error) return fail(userMessage(error, "We could not cancel this registration."));
  refresh();
  return ok(null, "Registration cancelled. Your place has been released.");
}

export async function respondToOffer(applicationId: string, accept: boolean): Promise<ActionResult<null>> {
  if (!(await getSessionUser())) return fail(SIGN_IN);
  if (!uuid.safeParse(applicationId).success) return fail("Invalid application.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_volunteer_offer", { p_application: applicationId, p_accept: accept });
  if (error) return fail(userMessage(error, "We could not record your response."));
  refresh();
  return ok(null, accept ? "Offer accepted. The organisers have been told." : "Offer declined.");
}

export async function withdrawApplication(applicationId: string): Promise<ActionResult<null>> {
  if (!(await getSessionUser())) return fail(SIGN_IN);
  if (!uuid.safeParse(applicationId).success) return fail("Invalid application.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_volunteer_application", { p_application: applicationId });
  if (error) return fail(userMessage(error, "We could not withdraw this application."));
  refresh();
  return ok(null, "Application withdrawn.");
}
