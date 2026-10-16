#!/usr/bin/env node
/**
 * Grant or revoke platform-administrator rights. Run by the project owner
 * from a trusted machine; it needs the server-only SUPABASE_SECRET_KEY.
 *
 *   npm run admin:grant -- someone@university.edu.pk
 *   npm run admin:grant -- someone@university.edu.pk --revoke
 *
 * The person must already have signed up and verified their email. There is
 * no other way to become an administrator: the platform_admins table has no
 * client-side write path.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

function fail() {
  process.exitCode = 1;
}

async function main() {
  const [email, flag] = process.argv.slice(2);
  if (!email || !email.includes("@")) {
    console.error("Usage: npm run admin:grant -- <email> [--revoke]");
    return fail();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set (in .env.local or the environment).");
    return fail();
  }

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: profile, error } = await supabase.from("profiles").select("id, full_name, contact_email").ilike("contact_email", email.trim()).maybeSingle();
  if (error) {
    console.error("Lookup failed:", error.message);
    return fail();
  }
  if (!profile) {
    console.error(`No verified account found for ${email}. Ask them to sign up and confirm their email first.`);
    return fail();
  }

  if (flag === "--revoke") {
    const { error: delError } = await supabase.from("platform_admins").delete().eq("user_id", profile.id);
    if (delError) {
      console.error("Revoke failed:", delError.message);
      return fail();
    }
    console.log(`Revoked administrator rights from ${profile.full_name || profile.contact_email}.`);
  } else {
    const { error: insError } = await supabase
      .from("platform_admins")
      .upsert({ user_id: profile.id, note: `Granted via scripts/grant-admin.mjs on ${new Date().toISOString().slice(0, 10)}` }, { onConflict: "user_id" });
    if (insError) {
      console.error("Grant failed:", insError.message);
      return fail();
    }
    console.log(`${profile.full_name || profile.contact_email} is now a platform administrator. They may need to sign in again.`);
  }
}

// exitCode instead of process.exit(): lets open sockets close cleanly (avoids a libuv assertion on Windows).
await main();
