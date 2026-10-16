/**
 * Browser-safe environment values. Only NEXT_PUBLIC_* variables belong here.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in (see README → Local development).`,
    );
  }
  return value;
}

export const publicEnv = {
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabasePublishableKey: required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
};

/**
 * Local Supabase delivers auth emails to its test inbox (Mailpit) instead of
 * real mailboxes. Only set when the app points at a local Supabase stack.
 */
export const devMailboxUrl: string | null = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(publicEnv.supabaseUrl)
  ? (process.env.NEXT_PUBLIC_DEV_MAILBOX_URL ?? "http://127.0.0.1:54324")
  : null;

