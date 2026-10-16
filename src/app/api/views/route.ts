import { createHash, randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/auth/same-origin";
import { serverEnv } from "@/lib/env/server";
import { createClient } from "@/lib/supabase/server";

const COOKIE = "cc_vid";
const body = z.object({ eventId: z.string().uuid(), kind: z.enum(["view", "start"]).default("view") });

/**
 * Counts a page view (or a registration-form opening) as one anonymous daily visitor. The random cookie id is
 * hashed together with the date and a server secret, so stored hashes cannot
 * be linked across days or back to a person. Bots that do not run JavaScript
 * are not counted because this is called from the browser.
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return new NextResponse(null, { status: 403 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 400 });

  let vid = request.cookies.get(COOKIE)?.value;
  const isNew = !vid || !/^[0-9a-f-]{36}$/.test(vid);
  if (isNew) vid = randomUUID();

  const day = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
  const hash = createHash("sha256").update(`${serverEnv.viewHashSalt}:${day}:${parsed.data.eventId}:${vid}`).digest("hex");

  const supabase = await createClient();
  // "start" = the registration form was opened (funnel step before submitting).
  if (parsed.data.kind === "start") await supabase.rpc("record_registration_start", { p_event: parsed.data.eventId, p_visitor_hash: hash });
  else await supabase.rpc("record_event_view", { p_event: parsed.data.eventId, p_visitor_hash: hash });

  const response = new NextResponse(null, { status: 204 });
  if (isNew && vid) {
    response.cookies.set(COOKIE, vid, { httpOnly: true, sameSite: "lax", secure: request.nextUrl.protocol === "https:", maxAge: 60 * 60 * 24 * 365, path: "/" });
  }
  return response;
}
