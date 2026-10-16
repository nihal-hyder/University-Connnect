import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton } from "@/components/common/action-button";
import { EmptyState } from "@/components/common/empty-state";
import { ToneBadge } from "@/components/common/tone-badge";
import { PageHeader, Section } from "@/components/layout/dashboard-shell";
import { SocietyAvatar } from "@/components/societies/society-tile";
import { Button } from "@/components/ui/button";
import { respondToInvitation } from "@/lib/actions/society";
import { requireViewer } from "@/lib/auth/session";
import { getPendingInvitations } from "@/lib/data/student";
import { formatDate, relativeFromNow } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/permissions";
import { APPLICATION_STATUS_COPY } from "@/lib/societies/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My societies" };

export default async function MySocietiesPage() {
  const viewer = await requireViewer("/dashboard/societies");
  const supabase = await createClient();
  const [applications, invitations] = await Promise.all([
    supabase
      .from("society_applications")
      .select("id, name, status, submitted_at, updated_at, admin_message, society:societies!society_applications_society_fk(slug)")
      .eq("applicant_id", viewer.user.id)
      .order("updated_at", { ascending: false }),
    getPendingInvitations(viewer.user.email),
  ]);

  return (
    <>
      <PageHeader
        title="My societies"
        description="Societies you belong to, invitations to join a team and your verification applications."
        actions={
          <Button asChild>
            <Link href="/societies/apply">Register a society</Link>
          </Button>
        }
      />

      {invitations.length ? (
        <Section title="Invitations">
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {invitations.map((inv) => (
              <li key={inv.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <SocietyAvatar name={inv.society.name} logoPath={inv.society.logo_path} size={40} />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{inv.society.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Role: {ROLE_LABELS[inv.role]} · expires {relativeFromNow(inv.expires_at)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <ActionButton size="sm" action={respondToInvitation.bind(null, inv.id, true)}>
                    Accept
                  </ActionButton>
                  <ActionButton size="sm" variant="ghost" action={respondToInvitation.bind(null, inv.id, false)}>
                    Decline
                  </ActionButton>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Memberships" className="mt-10">
        {viewer.memberships.length ? (
          <ul className="divide-y divide-border border-y border-border">
            {viewer.memberships.map((m) => (
              <li key={m.society_id} className="flex items-center gap-4 py-4">
                <SocietyAvatar name={m.society.name} logoPath={m.society.logo_path} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{m.society.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {ROLE_LABELS[m.role]}
                    {m.society.status === "suspended" ? " · suspended by platform staff" : ""}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/manage/${m.society.slug}`}>Open</Link>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            compact
            title="You're not part of a society team yet"
            description="Ask your society's owner to invite you by email, or register your society for verification."
          />
        )}
      </Section>

      <Section title="Verification applications" className="mt-10">
        {applications.data?.length ? (
          <ul className="divide-y divide-border border-y border-border">
            {applications.data.map((a) => {
              const copy = APPLICATION_STATUS_COPY[a.status];
              const editable = a.status === "draft" || a.status === "info_requested";
              return (
                <li key={a.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">{a.name}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {a.submitted_at ? `Submitted ${formatDate(a.submitted_at)}` : `Last edited ${formatDate(a.updated_at)}`}
                    </p>
                    {a.admin_message && (a.status === "info_requested" || a.status === "rejected") ? (
                      <p className="mt-2 max-w-xl rounded-md bg-secondary px-3 py-2 text-sm">Reviewer: {a.admin_message}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <ToneBadge tone={copy.tone} dot>
                      {copy.label}
                    </ToneBadge>
                    {editable ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/societies/apply?id=${a.id}`}>{a.status === "draft" ? "Continue" : "Update"}</Link>
                      </Button>
                    ) : a.status === "approved" && a.society ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/manage/${a.society.slug}`}>Manage</Link>
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No applications.</p>
        )}
      </Section>
    </>
  );
}
