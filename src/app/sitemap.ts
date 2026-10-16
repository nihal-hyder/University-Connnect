import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env/public";
import type { Database } from "@/lib/supabase/database.types";

// Rebuilt at most once an hour; search engines don't need it fresher.
export const revalidate = 3600;

const STATIC_PAGES: { path: string; changeFrequency: "daily" | "weekly" | "monthly"; priority: number }[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/explore", changeFrequency: "daily", priority: 0.9 },
  { path: "/opportunities", changeFrequency: "daily", priority: 0.8 },
  { path: "/societies", changeFrequency: "weekly", priority: 0.7 },
  { path: "/about", changeFrequency: "monthly", priority: 0.4 },
  { path: "/guidelines", changeFrequency: "monthly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.2 },
  { path: "/terms", changeFrequency: "monthly", priority: 0.2 },
];

/**
 * Public pages plus every published, non-demo event and active society.
 * Reads with the publishable key, so RLS limits it to what any visitor sees.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv.siteUrl;
  const entries: MetadataRoute.Sitemap = STATIC_PAGES.map((p) => ({ url: `${base}${p.path}`, changeFrequency: p.changeFrequency, priority: p.priority }));

  const supabase = createClient<Database>(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const [events, societies] = await Promise.all([
    supabase
      .from("events")
      .select("slug, updated_at")
      .eq("status", "published")
      .eq("is_demo", false)
      .order("starts_at", { ascending: false })
      .limit(5000),
    supabase.from("societies").select("slug, updated_at").eq("status", "active").eq("is_demo", false).limit(5000),
  ]);

  for (const e of events.data ?? []) {
    entries.push({ url: `${base}/events/${e.slug}`, lastModified: e.updated_at, changeFrequency: "daily", priority: 0.8 });
  }
  for (const s of societies.data ?? []) {
    entries.push({ url: `${base}/societies/${s.slug}`, lastModified: s.updated_at, changeFrequency: "weekly", priority: 0.6 });
  }
  return entries;
}
