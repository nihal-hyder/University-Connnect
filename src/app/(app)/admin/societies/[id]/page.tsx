import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, FileText } from "lucide-react";
import { ActionButton } from "@/components/common/action-button";
import { ToneBadge } from "@/components/common/tone-badge";
import { Section } from "@/components/layout/dashboard-shell";
import { SocietyAvatar } from "@/components/societies/society-tile";
import { reviewSocietyApplication } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { APPLICATION_STATUS_COPY } from "@/lib/societies/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Review application" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words whitespace-pre-line">{children || "—"}</dd>
    </div>
  );
}

export default async function ApplicationReview({ params }: PageProps<"/admin/societies/[id]">) {
  const viewer = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: a } = await supabase
    .from("society_applications")
    .select(
      `*, university:universities(name, short_name), campus:campuses(name), department:departments(name), category:event_categories(name),
       applicant:profiles!society_applications_applicant_id_fkey(full_name, contact_email), society:societies!society_applications_society_fk(slug)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!a) notFound();

  const [evidence, history, sameName] = await Promise.all([
    // Private bucket: a 5-minute signed link, generated only for admins (storage RLS).
    a.evidence_path ? supabase.storage.from("documents").createSignedUrl(a.evidence_path, 300) : Promise.resolve({ data: null }),
    supabase.from("moderation_actions").select("id, action, note, created_at, admin:profiles(full_name)").eq("target_type", "society_application").eq("target_id", a.id).order("created_at"),
    supabase.from("societies").select("slug, name").eq("university_id", a.university_id).ilike("name", a.name.replace(/[%_\\]/g, "")).limit(3),
  ]);

  const copy = APPLICATION_STATUS_COPY[a.status];
  const reviewable = a.status === "submitted" || a.status === "under_review";
  const own = a.applicant_id === viewer.user.id;
  const links = Array.isArray(a.social_links) ? (a.social_links as string[]) : [];

  return (
    <>
      <Link href="/admin/societies" className="text-sm text-muted-foreground hover:text-foreground">
        ← Applications
      </Link>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <SocietyAvatar name={a.name} logoPath={a.logo_path} size={56} />
          <div>
            <h1 className="font-display text-[2rem] leading-tight">{a.name}</h1>
            <p className="text-sm text-muted-foreground">
              {a.university?.name}
              {a.campus ? ` · ${a.campus.name}` : ""} · submitted {a.submitted_at ? formatDateTime(a.submitted_at) : "—"}
            </p>
          </div>
        </div>
        <ToneBadge tone={copy.tone} dot>
          {copy.label}
        </ToneBadge>
      </div>

      {sameName.data?.length ? (
        <p className="mt-6 rounded-lg bg-warning-soft px-4 py-3 text-sm text-warning">
          A verified society with this name already exists at this university:{" "}
          {sameName.data.map((s) => (
            <Link key={s.slug} href={`/societies/${s.slug}`} className="font-medium underline">
              {s.name}
            </Link>
          ))}
          . Approval will be blocked to prevent duplicates.
        </p>
      ) : null}

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-10">
          <Section title="Society">
            <dl className="divide-y divide-border rounded-xl border border-border bg-surface text-sm">
              <Row label="Description">{a.description}</Row>
              <Row label="Focus">{a.category?.name}</Row>
              <Row label="Scope">{[a.scope_label, a.department?.name].filter(Boolean).join(" · ")}</Row>
              <Row label="Team size">{a.team_size}</Row>
              <Row label="Website">
                {a.website_url ? (
                  <a href={a.website_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-primary hover:underline">
                    {a.website_url} <ExternalLink className="size-3" aria-hidden />
                  </a>
                ) : null}
              </Row>
              <Row label="Social links">
                {links.length
                  ? links.map((l) => (
                      <a key={l} href={l} target="_blank" rel="noopener noreferrer nofollow" className="block text-primary hover:underline">
                        {l}
                      </a>
                    ))
                  : null}
              </Row>
            </dl>
          </Section>
          <Section title="People">
            <dl className="divide-y divide-border rounded-xl border border-border bg-surface text-sm">
              <Row label="Applicant">
                {a.applicant?.full_name} ({a.applicant?.contact_email}) · {a.applicant_role}
              </Row>
              <Row label="President">{[a.president_name, a.president_email].filter(Boolean).join(" · ")}</Row>
              <Row label="Faculty advisor">{[a.faculty_advisor_name, a.faculty_advisor_title, a.faculty_advisor_email].filter(Boolean).join(" · ")}</Row>
              <Row label="Contact">{[a.contact_email, a.contact_phone].filter(Boolean).join(" · ")}</Row>
              <Row label="Public email">{a.public_contact_email}</Row>
            </dl>
          </Section>
          <Section title="Recognition">
            <dl className="divide-y divide-border rounded-xl border border-border bg-surface text-sm">
              <Row label="Explanation">{a.recognition_details}</Row>
              <Row label="Evidence">
                {evidence.data?.signedUrl ? (
                  <a href={evidence.data.signedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                    <FileText className="size-4" aria-hidden /> Open document (link valid 5 minutes)
                  </a>
                ) : a.evidence_path ? (
                  "Document could not be loaded."
                ) : (
                  "None attached"
                )}
              </Row>
            </dl>
          </Section>
          {history.data?.length ? (
            <Section title="Review history">
              <ol className="space-y-2 text-sm">
                {history.data.map((h) => (
                  <li key={h.id}>
                    <span className="font-mono text-xs text-muted-foreground">{formatDateTime(h.created_at)}</span> · {h.action.replaceAll("_", " ")}
                    {h.admin?.full_name ? ` by ${h.admin.full_name}` : ""}
                    {h.note ? <p className="text-muted-foreground">“{h.note}”</p> : null}
                  </li>
                ))}
              </ol>
            </Section>
          ) : null}
        </div>

        <aside className="min-w-0">
          <div className="space-y-2 lg:sticky lg:top-24">
            <h2 className="eyebrow mb-3">Decision</h2>
            {own ? (
              <p className="text-sm text-muted-foreground">You submitted this application, so another administrator must review it.</p>
            ) : reviewable ? (
              <div className="flex flex-col gap-2">
                {a.status === "submitted" ? (
                  <ActionButton variant="outline" action={reviewSocietyApplication.bind(null, a.id, "under_review")}>
                    Start review
                  </ActionButton>
                ) : null}
                <ActionButton
                  action={reviewSocietyApplication.bind(null, a.id, "approved")}
                  confirm={{
                    title: `Approve ${a.name}?`,
                    body: "The society gets a public profile and workspace, and the applicant becomes its owner. Its first events will still be reviewed.",
                    confirmLabel: "Approve",
                    note: { label: "Message to the applicant" },
                  }}
                >
                  Approve
                </ActionButton>
                <ActionButton
                  variant="outline"
                  action={reviewSocietyApplication.bind(null, a.id, "info_requested")}
                  confirm={{ title: "Ask for more information", confirmLabel: "Send request", note: { label: "What do they need to add?", required: true, placeholder: "At least 10 characters" } }}
                >
                  Request more information
                </ActionButton>
                <ActionButton
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  action={reviewSocietyApplication.bind(null, a.id, "rejected")}
                  confirm={{ title: "Reject this application?", confirmLabel: "Reject", destructive: true, note: { label: "Reason (sent to the applicant)", required: true, placeholder: "At least 10 characters" } }}
                >
                  Reject
                </ActionButton>
              </div>
            ) : a.status === "approved" && a.society ? (
              <Link href={`/societies/${a.society.slug}`} className="text-sm font-medium text-primary hover:underline">
                View society profile
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">No action needed in this status.</p>
            )}
            {a.admin_message ? <p className="mt-4 rounded-md bg-secondary px-3 py-2 text-sm">Last message: {a.admin_message}</p> : null}
          </div>
        </aside>
      </div>
    </>
  );
}
