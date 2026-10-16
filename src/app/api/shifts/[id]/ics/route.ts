import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { buildIcs } from "@/lib/calendar";
import { publicEnv } from "@/lib/env/public";
import { createClient } from "@/lib/supabase/server";

/** Calendar file for a volunteer shift. RLS: only assigned volunteers and role managers can read it. */
export async function GET(_request: Request, { params }: RouteContext<"/api/shifts/[id]/ics">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("volunteer_shifts")
    .select("id, title, starts_at, ends_at, location, instructions, role:volunteer_roles!inner(title, event:events!inner(title, slug))")
    .eq("id", id)
    .maybeSingle();
  if (!s) return new NextResponse("Not found", { status: 404 });
  const ics = buildIcs(
    [
      {
        uid: `shift-${s.id}@${new URL(publicEnv.siteUrl).hostname}`,
        title: `${s.role.title}: ${s.title} (${s.role.event.title})`,
        start: s.starts_at,
        end: s.ends_at,
        location: s.location,
        description: s.instructions,
        url: `${publicEnv.siteUrl}/dashboard/applications`,
      },
    ],
    siteConfig.name,
  );
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="shift-${s.id.slice(0, 8)}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
