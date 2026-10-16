import type { Metadata } from "next";
import Link from "next/link";
import { Download, Search } from "lucide-react";
import { ActionButton } from "@/components/common/action-button";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/components/common/pagination";
import { ToneBadge } from "@/components/common/tone-badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { setRegistrationStatus } from "@/lib/actions/events";
import { requireEventAccess } from "@/lib/data/manage";
import { REGISTRATION_STATUS_LABELS, REGISTRATION_STATUS_TONE, type RegistrationStatus } from "@/lib/events/labels";
import { formatAnswer, parseStoredFields } from "@/lib/forms/schema";
import { formatDateTime, pluralize } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { universityForEmail } from "@/lib/university-email";

export const metadata: Metadata = { title: "Registrations" };

const PAGE_SIZE = 40;
const STATUSES: RegistrationStatus[] = ["pending", "confirmed", "waitlisted", "rejected", "cancelled"];

export default async function RegistrationsAdminPage({ params, searchParams }: PageProps<"/manage/[slug]/events/[eventId]/registrations">) {
  const { slug, eventId } = await params;
  const sp = await searchParams;
  const { event, access } = await requireEventAccess(slug, eventId, "viewRegistrations");
  const status = STATUSES.find((s) => s === sp.status);
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  const actx = { societySlug: slug, eventSlug: event.slug };

  // Search by reference or by name/email through the joined profile.
  let query = supabase
    .from("registrations")
    .select(
      "id, status, reference_code, answers, team_name, team_members, created_at, decision_note, form_version_id, user:profiles!registrations_user_id_fkey!inner(full_name, contact_email)",
      { count: "exact" },
    )
    .eq("event_id", event.id)
    .order("created_at", { ascending: true })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status) query = query.eq("status", status);
  if (q) {
    const safe = q.replace(/[%_\\,()*]/g, "");
    if (/^R-[A-Z0-9-]+$/i.test(safe)) query = query.ilike("reference_code", `${safe}%`);
    else query = query.or(`full_name.ilike.%${safe}%,contact_email.ilike.%${safe}%`, { referencedTable: "user" });
  }

  const [{ data: rows, count }, { data: forms }, { data: checkins }] = await Promise.all([
    query,
    supabase.from("form_versions").select("id, fields").eq("event_id", event.id),
    supabase.from("attendance_records").select("registration_id").eq("event_id", event.id),
  ]);
  const { data: unis } = await supabase.from("universities").select("name, short_name, email_domains").eq("is_active", true);
  const formById = new Map((forms ?? []).map((f) => [f.id, parseStoredFields(f.fields)]));
  const checkedIn = new Set((checkins ?? []).map((c) => c.registration_id));
  const total = count ?? 0;
  const hrefFor = (p: number) => {
    const u = new URLSearchParams();
    if (status) u.set("status", status);
    if (q) u.set("q", q);
    if (p > 1) u.set("page", String(p));
    return `?${u.toString()}`;
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <form method="get" className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <label htmlFor="reg-q" className="text-sm font-medium">
              Search
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                id="reg-q"
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Name, email or reference"
                className="h-10 w-64 rounded-lg border border-input bg-surface pr-3 pl-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="reg-status" className="text-sm font-medium">
              Status
            </label>
            <NativeSelect id="reg-status" name="status" defaultValue={status ?? ""} className="w-44">
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {REGISTRATION_STATUS_LABELS[s]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button type="submit" variant="outline">
            Filter
          </Button>
        </form>
        {access.exportData ? (
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`/api/manage/events/${event.id}/export?type=registrations`}>
                <Download /> Registrations CSV
              </a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <a href={`/api/manage/events/${event.id}/export?type=attendance`}>
                <Download /> Attendance CSV
              </a>
            </Button>
          </div>
        ) : null}
      </div>

      <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
        {pluralize(total, "registration")}
        {event.capacity ? ` · ${event.confirmed_count} of ${event.capacity} places confirmed` : ""}
      </p>

      {rows?.length ? (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {rows.map((r) => {
            const fields = (r.form_version_id && formById.get(r.form_version_id)) || [];
            const answers = (r.answers ?? {}) as Record<string, unknown>;
            const team = Array.isArray(r.team_members) ? (r.team_members as { name: string; email: string }[]) : [];
            const hasDetails = fields.some((f) => f.type !== "statement") || team.length > 0;
            return (
              <li key={r.id} className="px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {r.user.full_name || "Unnamed"}
                      {r.team_name ? <span className="font-normal text-muted-foreground"> · team {r.team_name}</span> : null}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {r.user.contact_email} · <span className="font-mono text-xs">{r.reference_code}</span> · {formatDateTime(r.created_at)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <ToneBadge tone={REGISTRATION_STATUS_TONE[r.status]} dot>
                        {REGISTRATION_STATUS_LABELS[r.status]}
                      </ToneBadge>
                      {checkedIn.has(r.id) ? <ToneBadge tone="positive">Checked in</ToneBadge> : null}
                      {(() => {
                        const u = universityForEmail(r.user.contact_email, unis ?? []);
                        return u ? <ToneBadge tone="info">{u.short_name ?? u.name} email</ToneBadge> : null;
                      })()}
                    </div>
                  </div>
                  {access.manageRegistrations ? (
                    <div className="flex flex-wrap gap-2">
                      {r.status === "pending" || r.status === "waitlisted" ? (
                        <ActionButton size="sm" action={setRegistrationStatus.bind(null, r.id, "confirmed", actx)}>
                          Confirm
                        </ActionButton>
                      ) : null}
                      {r.status === "pending" ? (
                        <ActionButton size="sm" variant="outline" action={setRegistrationStatus.bind(null, r.id, "waitlisted", actx)}>
                          Waitlist
                        </ActionButton>
                      ) : null}
                      {r.status === "pending" || r.status === "waitlisted" || r.status === "confirmed" ? (
                        <ActionButton
                          size="sm"
                          variant="ghost"
                          action={setRegistrationStatus.bind(null, r.id, "rejected", actx)}
                          confirm={{
                            title: `Decline ${r.user.full_name || "this registration"}?`,
                            body: r.status === "confirmed" ? "They already have a confirmed place and ticket. Their ticket will stop working." : "They will be notified.",
                            confirmLabel: "Decline",
                            destructive: true,
                            note: { label: "Message to the participant", required: r.status === "confirmed" },
                          }}
                        >
                          Decline
                        </ActionButton>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {hasDetails ? (
                  <details className="group mt-3">
                    <summary className="cursor-pointer text-sm font-medium text-primary">Answers{team.length ? " and team" : ""}</summary>
                    <dl className="mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[14rem_1fr]">
                      {fields
                        .filter((f) => f.type !== "statement")
                        .map((f) => (
                          <div key={f.id} className="contents">
                            <dt className="text-muted-foreground">{f.label}</dt>
                            <dd className="whitespace-pre-line">{formatAnswer(answers[f.id]) || "—"}</dd>
                          </div>
                        ))}
                      {team.length ? (
                        <div className="contents">
                          <dt className="text-muted-foreground">Team members</dt>
                          <dd>{team.map((m) => `${m.name} (${m.email})`).join(", ")}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          compact
          title={q || status ? "No registrations match" : "No registrations yet"}
          description={q || status ? undefined : "When people register, they appear here. Share the event page to get started."}
          action={
            q || status ? (
              <Button asChild size="sm" variant="outline">
                <Link href="?">Clear filters</Link>
              </Button>
            ) : null
          }
        />
      )}
      <Pagination className="mt-8" page={page} pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))} hrefFor={hrefFor} />
    </>
  );
}
