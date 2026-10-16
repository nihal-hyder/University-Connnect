import "server-only";

/**
 * Server-only secrets. Importing this module from a Client Component fails the
 * build (server-only), so secrets can never reach the browser bundle.
 */
export const serverEnv = {
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendWebhookSecret: process.env.RESEND_WEBHOOK_SECRET ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "CampusConnect <onboarding@resend.dev>",
  emailReplyTo: process.env.EMAIL_REPLY_TO || undefined,
  jobSecret: process.env.JOB_SECRET ?? "",
  viewHashSalt: process.env.VIEW_HASH_SALT ?? "",
};

export const emailMode: "resend" | "development" = serverEnv.resendApiKey ? "resend" : "development";
