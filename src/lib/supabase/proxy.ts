import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env/public";
import { isOpenDuringMaintenance, parseSiteStatus } from "@/lib/site-status";
import type { Database } from "./database.types";

const PROTECTED_PREFIXES = ["/dashboard", "/manage", "/admin", "/onboarding", "/societies/apply"];

/**
 * Refreshes the Supabase session cookie on every request and performs a fast
 * optimistic redirect for signed-out visitors on private routes. This is NOT
 * the authorisation boundary: every page and action re-checks on the server
 * and the database enforces RLS.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  // Do not run code between createServerClient and getClaims().
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const signedIn = Boolean(userId);

  const path = request.nextUrl.pathname;

  // Maintenance mode: everyone except platform administrators sees /maintenance.
  if (!isOpenDuringMaintenance(path) && (await maintenanceEnabled(supabase))) {
    const isAdmin = userId ? Boolean((await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle()).data) : false;
    if (!isAdmin) return maintenanceResponse(request, response, path);
  }

  if (!signedIn && PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", path + request.nextUrl.search);
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  return response;
}

// Best-effort per-instance cache so every request doesn't query the database.
// Turning maintenance on or off takes effect within this many milliseconds.
const STATUS_TTL_MS = 5_000;
let cachedStatus: { maintenance: boolean; expires: number } | null = null;

async function maintenanceEnabled(supabase: SupabaseClient<Database>): Promise<boolean> {
  if (cachedStatus && cachedStatus.expires > Date.now()) return cachedStatus.maintenance;
  const { data, error } = await supabase.rpc("get_site_status");
  // Fail open: a database hiccup must never take the whole site offline.
  const maintenance = error ? false : parseSiteStatus(data).maintenance;
  cachedStatus = { maintenance, expires: Date.now() + STATUS_TTL_MS };
  return maintenance;
}

function maintenanceResponse(request: NextRequest, response: NextResponse, path: string) {
  const headers = { "Retry-After": "3600", "Cache-Control": "no-store" };
  const res = path.startsWith("/api/")
    ? NextResponse.json({ error: "The site is under maintenance. Please try again soon." }, { status: 503, headers })
    : NextResponse.rewrite(new URL("/maintenance", request.url), { status: 503, headers });
  for (const cookie of response.cookies.getAll()) res.cookies.set(cookie);
  return res;
}
