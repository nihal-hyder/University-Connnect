import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Helpers for database authorisation tests. They only ever target the local
 * Supabase stack with seeded demo accounts (supabase/seeds/demo.sql).
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const secretKey = process.env.SUPABASE_SECRET_KEY ?? "";

if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(url)) {
  throw new Error(`Refusing to run database tests against ${url || "an unset URL"}. They only run against local Supabase.`);
}

export type Db = SupabaseClient<Database>;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

export const SOCIETY = {
  computing: "00000000-0000-4000-8000-0000000000a1", // owner sara, coordinator hamza
  entrepreneurship: "00000000-0000-4000-8000-0000000000a2", // owner zainab
};
export const USER = {
  admin: "00000000-0000-4000-8000-000000000001",
  ayesha: "00000000-0000-4000-8000-000000000002",
  bilal: "00000000-0000-4000-8000-000000000003",
  sara: "00000000-0000-4000-8000-000000000004",
  hamza: "00000000-0000-4000-8000-000000000005",
  zainab: "00000000-0000-4000-8000-000000000006",
};

export function anon(): Db {
  return createClient<Database>(url, anonKey, opts);
}

export function service(): Db {
  if (!secretKey) throw new Error("SUPABASE_SECRET_KEY is required for fixtures (see .env.example).");
  return createClient<Database>(url, secretKey, opts);
}

const sessions = new Map<string, Db>();
export async function as(name: keyof typeof USER): Promise<Db> {
  const cached = sessions.get(name);
  if (cached) return cached;
  const client = createClient<Database>(url, anonKey, opts);
  const { error } = await client.auth.signInWithPassword({ email: `${name}@example.com`, password: "DemoPass123" });
  if (error) throw new Error(`Could not sign in as ${name}: ${error.message}. Did you run npm run db:reset?`);
  sessions.set(name, client);
  return client;
}

export const tag = `t${Date.now().toString(36)}`;
const days = (n: number) => new Date(Date.now() + n * 864e5).toISOString();

/** Creates a published event directly (service role) for isolated tests. */
export async function makeEvent(overrides: Partial<Database["public"]["Tables"]["events"]["Insert"]> = {}) {
  const db = service();
  const slug = `${tag}-${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await db
    .from("events")
    .insert({
      society_id: SOCIETY.computing,
      slug,
      title: `Test event ${slug}`,
      description: "Automated test fixture. Safe to delete. ".repeat(3),
      category_id: 1,
      city_id: 1,
      venue: "Test hall",
      starts_at: days(10),
      ends_at: days(11),
      status: "published",
      published_at: new Date().toISOString(),
      registration_mode: "individual",
      ...overrides,
    })
    .select("id, slug")
    .single();
  if (error) throw new Error(`makeEvent: ${error.message}`);
  return data;
}

export async function cleanup() {
  const db = service();
  const { data } = await db.from("events").select("id").like("slug", `${tag}-%`);
  const ids = (data ?? []).map((e) => e.id);
  if (ids.length) {
    await db.from("certificates").delete().in("event_id", ids);
    await db.from("events").delete().in("id", ids);
  }
}

export { days };
