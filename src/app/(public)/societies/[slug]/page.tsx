import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BadgeCheck, ExternalLink, Globe, Mail } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { SampleBadge } from "@/components/common/tone-badge";
import { ReportDialog } from "@/components/events/event-actions";
import { EventCard, EventRow } from "@/components/events/event-card";
import { SocietyAvatar } from "@/components/societies/society-tile";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { searchEvents } from "@/lib/data/events";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const getSociety = cache(async (slug: string) => {
  const supabase = await createClient();
  // RLS returns only active (approved, not suspended) societies to the public.
  const { data } = await supabase
    .from("societies")
    .select(
      `id, slug, name, description, scope_label, logo_path, website_url, social_links, public_contact_email, verified_at, is_demo, status,
       university:universities(id, name, short_name), campus:campuses(name), category:event_categories(name, slug)`,
    )
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  return data;
});

export async function generateMetadata({ params }: PageProps<"/societies/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const s = await getSociety(slug);
  if (!s) return { title: "Society not found", robots: { index: false } };
  const description = s.description?.slice(0, 180) ?? `${s.name} at ${s.university?.name ?? "a Pakistani university"}.`;
  return {
    title: s.name,
    description,
    openGraph: { title: s.name, description, type: "profile" },
    robots: s.is_demo ? { index: false } : undefined,
  };
}

function hostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default async function SocietyProfilePage({ params }: PageProps<"/societies/[slug]">) {
  const { slug } = await params;
  const society = await getSociety(slug);
  if (!society) notFound();
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const [user, upcoming, past, collaborations] = await Promise.all([
    getSessionUser(),
    searchEvents({ society: society.id, sort: "soonest" }, 1, 12),
    supabase
      .from("events")
      .select(
        `slug, title, starts_at, ends_at, timezone, format, is_demo, city:cities(name), university:universities!events_university_id_fkey(name, short_name)`,
      )
      .eq("society_id", society.id)
      .eq("status", "published")
      .lt("ends_at", nowIso)
      .order("starts_at", { ascending: false })
      .limit(8),
    supabase
      .from("event_collaborations")
      .select("event:events!inner(slug, title, starts_at, status, society:societies!events_society_id_fkey(name, slug))")
      .eq("society_id", society.id)
      .eq("status", "accepted")
      .eq("event.status", "published")
      .limit(8),
  ]);

  const links = Array.isArray(society.social_links) ? (society.social_links as string[]).filter((l) => typeof l === "string") : [];

  return (
    <div className="page-container py-10 md:py-14">
      <header className="grid gap-8 border-b border-border pb-10 md:grid-cols-[1fr_18rem]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <SocietyAvatar name={society.name} logoPath={society.logo_path} size={88} />
          <div className="min-w-0">
            <p className="eyebrow text-signal-ink">
              {society.university?.name}
              {society.campus ? ` · ${society.campus.name}` : ""}
            </p>
            <h1 className="mt-2 font-display text-headline">{society.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 text-primary">
                <BadgeCheck className="size-4" aria-hidden />
                Verified society{society.verified_at ? ` since ${formatDate(society.verified_at)}` : ""}
              </span>
              {society.category ? <span>{society.category.name}</span> : null}
              {society.scope_label ? <span>{society.scope_label}</span> : null}
              {society.is_demo ? <SampleBadge /> : null}
            </div>
          </div>
        </div>
        <aside className="space-y-3 text-sm">
          {society.website_url ? (
            <a href={society.website_url} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-2 hover:underline">
              <Globe className="size-4 text-muted-foreground" aria-hidden /> {hostLabel(society.website_url)}
            </a>
          ) : null}
          {links.map((l) => (
            <a key={l} href={l} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-2 hover:underline">
              <ExternalLink className="size-4 text-muted-foreground" aria-hidden /> {hostLabel(l)}
            </a>
          ))}
          {society.public_contact_email ? (
            <a href={`mailto:${society.public_contact_email}`} className="flex items-center gap-2 hover:underline">
              <Mail className="size-4 text-muted-foreground" aria-hidden /> {society.public_contact_email}
            </a>
          ) : null}
          <div className="pt-2">
            <ReportDialog target="society" targetId={society.id} signedIn={Boolean(user)} />
          </div>
        </aside>
      </header>

      {society.description ? (
        <section className="mt-10 max-w-prose">
          <h2 className="sr-only">About</h2>
          <div className="prose-body whitespace-pre-line">{society.description}</div>
        </section>
      ) : null}

      <section className="mt-14" aria-labelledby="upcoming-heading">
        <h2 id="upcoming-heading" className="font-display text-2xl">
          Upcoming events
        </h2>
        {upcoming.items.length ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.items.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        ) : (
          <EmptyState compact className="mt-4" title="No upcoming events" description="This society hasn't published any upcoming events yet." />
        )}
      </section>

      <div className="mt-14 grid gap-12 lg:grid-cols-2">
        <section aria-labelledby="past-heading">
          <h2 id="past-heading" className="font-display text-2xl">
            Past events
          </h2>
          {past.data?.length ? (
            <div className="mt-4 divide-y divide-border border-y border-border">
              {past.data.map((e) => (
                <EventRow
                  key={e.slug}
                  event={{
                    ...e,
                    society_name: society.name,
                    city_name: e.city?.name ?? null,
                    university_name: e.university?.name ?? null,
                    university_short: e.university?.short_name ?? null,
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No past events on the platform yet.</p>
          )}
        </section>
        <section aria-labelledby="collab-heading">
          <h2 id="collab-heading" className="font-display text-2xl">
            Collaborations
          </h2>
          {collaborations.data?.length ? (
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {collaborations.data.map((c) => (
                <li key={c.event.slug} className="py-3.5 text-sm">
                  <Link href={`/events/${c.event.slug}`} className="font-medium hover:underline">
                    {c.event.title}
                  </Link>
                  <p className="text-muted-foreground">
                    Co-organised with{" "}
                    <Link href={`/societies/${c.event.society.slug}`} className="hover:underline">
                      {c.event.society.name}
                    </Link>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No collaborations with other societies yet.</p>
          )}
        </section>
      </div>

      <div className="mt-16 flex flex-col gap-3 rounded-xl border border-border bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Are you a member of {society.name}? Ask its owner to invite you to the organising team.
        </p>
        <Button asChild variant="outline">
          <Link href={`/explore?society=${society.id}`}>All events by this society</Link>
        </Button>
      </div>
    </div>
  );
}
