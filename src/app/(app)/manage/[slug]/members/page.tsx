import type { Metadata } from "next";
import { ActionButton } from "@/components/common/action-button";
import { PageHeader, Section } from "@/components/layout/dashboard-shell";
import { InviteMemberForm, MemberRoleSelect, TransferOwnershipDialog } from "@/components/manage/member-tools";
import { removeMember, revokeInvitation } from "@/lib/actions/society";
import { requireSocietyAccess } from "@/lib/auth/session";
import { formatDate, relativeFromNow } from "@/lib/format";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, type SocietyRole } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Members & roles" };

type Assignable = Exclude<SocietyRole, "owner">;

export default async function MembersPage({ params }: PageProps<"/manage/[slug]/members">) {
  const { slug } = await params;
  const ctx = await requireSocietyAccess(slug);
  const supabase = await createClient();
  const isOwner = ctx.role === "owner";
  const canManage = ctx.can("manage_members") && ctx.society.status === "active";
  // Owners manage everyone; administrators manage everyone except administrators.
  const assignable: Assignable[] = isOwner ? ["admin", "event_manager", "volunteer_coordinator", "analyst"] : ["event_manager", "volunteer_coordinator", "analyst"];

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("society_memberships")
      .select("id, user_id, role, title, created_at, user:profiles!society_memberships_user_id_fkey(full_name, contact_email)")
      .eq("society_id", ctx.society.id)
      .order("created_at"),
    canManage
      ? supabase.from("society_invitations").select("id, email, role, expires_at, created_at").eq("society_id", ctx.society.id).eq("status", "pending").order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const others = (members ?? []).filter((m) => m.user_id !== ctx.viewer.user.id);

  return (
    <>
      <PageHeader title="Members & roles" description="Everyone on your organising team and what each role can do." />
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <Section title={`Team (${members?.length ?? 0})`}>
            <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
              {(members ?? []).map((m) => {
                const me = m.user_id === ctx.viewer.user.id;
                const editable = canManage && !me && m.role !== "owner" && (isOwner || m.role !== "admin");
                const name = m.user?.full_name || m.user?.contact_email || "Member";
                return (
                  <li key={m.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {name} {me ? <span className="font-normal text-muted-foreground">(you)</span> : null}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {m.user?.contact_email} · joined {formatDate(m.created_at)}
                      </p>
                    </div>
                    {editable ? (
                      <div className="flex items-center gap-2">
                        <MemberRoleSelect membershipId={m.id} slug={slug} current={m.role as Assignable} roles={assignable} label={name} />
                        <ActionButton
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          action={removeMember.bind(null, m.id, slug)}
                          confirm={{ title: `Remove ${name}?`, body: "They lose access to this workspace immediately.", confirmLabel: "Remove", destructive: true }}
                        >
                          Remove
                        </ActionButton>
                      </div>
                    ) : (
                      <span className="text-sm font-medium">{ROLE_LABELS[m.role]}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>

          {canManage && invites?.length ? (
            <Section title="Pending invitations" className="mt-10">
              <ul className="divide-y divide-border border-y border-border text-sm">
                {invites.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-4 py-3">
                    <span>
                      <span className="font-medium">{i.email}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {ROLE_LABELS[i.role]} · expires {relativeFromNow(i.expires_at)}
                      </span>
                    </span>
                    <ActionButton size="sm" variant="ghost" action={revokeInvitation.bind(null, i.id, slug)}>
                      Revoke
                    </ActionButton>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          <Section title="What each role can do" className="mt-10">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              {(Object.keys(ROLE_LABELS) as SocietyRole[]).map((r) => (
                <div key={r}>
                  <dt className="font-medium">{ROLE_LABELS[r]}</dt>
                  <dd className="mt-0.5 leading-6 text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</dd>
                </div>
              ))}
            </dl>
          </Section>
        </div>

        <aside className="min-w-0 space-y-8">
          {canManage ? (
            <Section title="Invite a member">
              <InviteMemberForm societyId={ctx.society.id} slug={slug} roles={assignable} />
            </Section>
          ) : null}
          {isOwner ? (
            <Section title="Ownership">
              <p className="mb-3 text-sm leading-6 text-muted-foreground">
                Handing over to next year&rsquo;s team? Transfer ownership to an existing member.
              </p>
              <TransferOwnershipDialog
                societyId={ctx.society.id}
                slug={slug}
                members={others.map((m) => ({ userId: m.user_id, name: m.user?.full_name || m.user?.contact_email || "Member" }))}
              />
            </Section>
          ) : null}
        </aside>
      </div>
    </>
  );
}
