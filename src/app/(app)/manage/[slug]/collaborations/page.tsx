import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton } from "@/components/common/action-button";
import { EmptyState } from "@/components/common/empty-state";
import { ToneBadge } from "@/components/common/tone-badge";
import { PageHeader, Section } from "@/components/layout/dashboard-shell";
import { respondToCollaboration } from "@/lib/actions/events";
import { requireSocietyAccess } from "@/lib/auth/session";
import { PERMISSION_COPY, permsFromRow } from "@/lib/events/collaboration";
import { formatDate } from "@/lib/format";
import { COLLABORATION_STATUS_COPY } from "@/lib/societies/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Collaborations" };

export default async function CollaborationsPage({ params }: PageProps<"/manage/[slug]/collaborations">) {
  const { slug } = await params;
  const ctx = await requireSocietyAccess(slug);
  const supabase = await createClient();
  const canRespond = ctx.can("manage_collaborations") && ctx.society.status === "active";

  const [incoming, outgoing] = await Promise.all([
    supabase
      .from("event_collaborations")
      .select(
        "id, status, message, created_at, can_edit_details, can_manage_volunteers, can_view_registrations, can_check_in, can_view_analytics, event:events!inner(id, title, starts_at, timezone, host:societies!events_society_id_fkey(name, slug))",
      )
      .eq("society_id", ctx.society.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("event_collaborations")
      .select("id, status, created_at, society:societies!inner(name, slug), event:events!inner(id, title, society_id)")
      .eq("event.society_id", ctx.society.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <>
      <PageHeader title="Collaborations" description="Events you co-organise with other verified societies." />
      <Section title="Invitations to your society">
        {incoming.data?.length ? (
          <ul className="space-y-3">
            {incoming.data.map((c) => {
              const perms = permsFromRow(c);
              const granted = PERMISSION_COPY.filter((p) => perms[p.key]);
              const copy = COLLABORATION_STATUS_COPY[c.status];
              return (
                <li key={c.id} className="rounded-xl border border-border bg-surface p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {c.status === "accepted" ? (
                          <Link href={`/manage/${slug}/events/${c.event.id}`} className="hover:underline">
                            {c.event.title}
                          </Link>
                        ) : (
                          c.event.title
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Hosted by{" "}
                        <Link href={`/societies/${c.event.host.slug}`} className="hover:underline">
                          {c.event.host.name}
                        </Link>{" "}
                        · {formatDate(c.event.starts_at, c.event.timezone)}
                      </p>
                    </div>
                    <ToneBadge tone={copy.tone} dot>
                      {copy.label}
                    </ToneBadge>
                  </div>
                  {c.message ? <p className="mt-3 text-sm leading-6 whitespace-pre-line">&ldquo;{c.message}&rdquo;</p> : null}
                  <p className="mt-3 text-sm text-muted-foreground">
                    Access offered: {granted.length ? granted.map((g) => g.label.toLowerCase()).join(", ") : "listed as co-organiser only"}.
                  </p>
                  {c.status === "pending" && canRespond ? (
                    <div className="mt-4 flex gap-2">
                      <ActionButton size="sm" action={respondToCollaboration.bind(null, c.id, true, { societySlug: slug })}>
                        Accept
                      </ActionButton>
                      <ActionButton size="sm" variant="ghost" action={respondToCollaboration.bind(null, c.id, false, { societySlug: slug })}>
                        Decline
                      </ActionButton>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState compact title="No invitations" description="When another society invites you to co-organise an event, it appears here." />
        )}
      </Section>

      <Section title="Invitations you've sent" className="mt-10">
        {outgoing.data?.length ? (
          <ul className="divide-y divide-border border-y border-border text-sm">
            {outgoing.data.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 py-3">
                <span>
                  <span className="font-medium">{c.society.name}</span> · {c.event.title}
                </span>
                <span className="flex items-center gap-3">
                  <ToneBadge tone={COLLABORATION_STATUS_COPY[c.status].tone}>{COLLABORATION_STATUS_COPY[c.status].label}</ToneBadge>
                  <Link href={`/manage/${slug}/events/${c.event.id}/collaborators`} className="font-medium text-primary hover:underline">
                    Manage
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">You haven&rsquo;t invited any societies yet. Invite them from an event&rsquo;s Collaborators tab.</p>
        )}
      </Section>
    </>
  );
}
