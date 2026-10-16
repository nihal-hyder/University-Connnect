import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton } from "@/components/common/action-button";
import { ToneBadge } from "@/components/common/tone-badge";
import { Section } from "@/components/layout/dashboard-shell";
import { EditCollaborationPermissions, InviteCollaboratorForm } from "@/components/manage/invite-collaborator";
import { SocietyAvatar } from "@/components/societies/society-tile";
import { revokeCollaboration } from "@/lib/actions/events";
import { getManagedEvent } from "@/lib/data/manage";
import { PERMISSION_COPY, permsFromRow } from "@/lib/events/collaboration";
import { formatDate } from "@/lib/format";
import { COLLABORATION_STATUS_COPY } from "@/lib/societies/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Collaborators" };

export default async function CollaboratorsPage({ params }: PageProps<"/manage/[slug]/events/[eventId]/collaborators">) {
  const { slug, eventId } = await params;
  const { ctx, event, access } = await getManagedEvent(slug, eventId);
  const supabase = await createClient();
  const manage = access.isHost && access.manageCollaborations && ctx.society.status === "active";

  const [{ data: collabs }, societies] = await Promise.all([
    supabase
      .from("event_collaborations")
      .select("id, status, message, created_at, responded_at, can_edit_details, can_manage_volunteers, can_view_registrations, can_check_in, can_view_analytics, society:societies!inner(id, name, slug, logo_path)")
      .eq("event_id", event.id)
      .order("created_at"),
    manage
      ? supabase.from("societies").select("id, name, university:universities(short_name, name)").eq("status", "active").neq("id", event.society_id).order("name").limit(500)
      : Promise.resolve({ data: [] }),
  ]);

  const existing = new Set((collabs ?? []).filter((c) => c.status === "pending" || c.status === "accepted").map((c) => c.society.id));
  const options = (societies.data ?? [])
    .filter((s) => !existing.has(s.id))
    .map((s) => ({ id: s.id, name: s.name, university: s.university?.short_name ?? s.university?.name ?? null }));

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0">
        <Section
          title="Co-organising societies"
          description="Accepted collaborators are shown on the public event page. They only get the access listed for them."
        >
          {collabs?.length ? (
            <ul className="space-y-3">
              {collabs.map((c) => {
                const copy = COLLABORATION_STATUS_COPY[c.status];
                const perms = permsFromRow(c);
                const granted = PERMISSION_COPY.filter((p) => perms[p.key]);
                const isMine = c.society.id === ctx.society.id;
                return (
                  <li key={c.id} className="rounded-xl border border-border bg-surface p-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <SocietyAvatar name={c.society.name} logoPath={c.society.logo_path} size={36} />
                      <Link href={`/societies/${c.society.slug}`} className="font-medium hover:underline">
                        {c.society.name}
                      </Link>
                      <ToneBadge tone={copy.tone} dot>
                        {copy.label}
                      </ToneBadge>
                      <span className="text-xs text-muted-foreground">Invited {formatDate(c.created_at)}</span>
                    </div>
                    {manage && (c.status === "pending" || c.status === "accepted") ? (
                      <div className="mt-4 border-t border-border pt-4">
                        <EditCollaborationPermissions collaborationId={c.id} societySlug={slug} initial={perms} />
                        <ActionButton
                          size="sm"
                          variant="ghost"
                          className="mt-2 text-destructive hover:text-destructive"
                          action={revokeCollaboration.bind(null, c.id, { societySlug: slug, eventSlug: event.slug })}
                          confirm={{
                            title: c.status === "pending" ? "Withdraw this invitation?" : `End collaboration with ${c.society.name}?`,
                            body: "They lose all access to this event immediately.",
                            confirmLabel: c.status === "pending" ? "Withdraw" : "End collaboration",
                            destructive: true,
                          }}
                        >
                          {c.status === "pending" ? "Withdraw invitation" : "End collaboration"}
                        </ActionButton>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">
                        {isMine ? "Your access: " : "Access: "}
                        {granted.length ? granted.map((g) => g.label.toLowerCase()).join(", ") : "listed on the event page only"}.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No collaborators yet.</p>
          )}
        </Section>
      </div>
      {manage ? (
        <aside className="min-w-0">
          <Section title="Invite a society">
            <InviteCollaboratorForm eventId={event.id} societySlug={slug} options={options} />
          </Section>
        </aside>
      ) : null}
    </div>
  );
}
