import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { buildIcs } from "@/lib/calendar";
import { getEventBySlug } from "@/lib/data/event-detail";
import { publicEnv } from "@/lib/env/public";

/** Calendar file for an event the viewer can see (published, or their own draft via RLS). */
export async function GET(_request: Request, { params }: RouteContext<"/events/[slug]/calendar.ics">) {
  const { slug } = await params;
  const data = await getEventBySlug(slug);
  if (!data?.event.starts_at) return new NextResponse("Not found", { status: 404 });
  const e = data.event;
  const location =
    e.format === "online"
      ? "Online"
      : [e.venue, e.campus?.name, e.university?.short_name ?? e.university?.name, e.city?.name].filter(Boolean).join(", ");
  const ics = buildIcs(
    [
      {
        uid: `event-${e.id}@${new URL(publicEnv.siteUrl).hostname}`,
        title: e.title,
        start: e.starts_at!,
        end: e.ends_at,
        location: location || null,
        description: [e.summary, `Organised by ${e.society?.name ?? "a student society"}.`].filter(Boolean).join(" "),
        url: `${publicEnv.siteUrl}/events/${e.slug}`,
      },
    ],
    siteConfig.name,
  );
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${e.slug}.ics"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
