import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env/public";
import { serverEnv } from "@/lib/env/server";
import type { Database } from "./database.types";

/**
 * Privileged client using the secret key. It BYPASSES Row Level Security.
 * Only use it for trusted server-side work that has no user session:
 * the scheduled job worker and account deletion. Never pass user input to it
 * without performing authorisation first.
 */
export function createAdminClient() {
  if (!serverEnv.supabaseSecretKey) {
    throw new Error("SUPABASE_SECRET_KEY is not configured. See README → Environment variables.");
  }
  return createClient<Database>(publicEnv.supabaseUrl, serverEnv.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
