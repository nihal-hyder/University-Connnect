import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton } from "@/components/common/action-button";
import { SampleBadge, ToneBadge } from "@/components/common/tone-badge";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { setSocietyReviewPolicy, setSocietyStatus } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Societies" };

export default async function AdminSocietiesPage({ searchParams }: PageProps<"/admin/active-societies">) {
  await requireAdmin();
  const { q: rawQ } = await searchParams;
  const q = typeof rawQ === "string" ? rawQ.trim().replace(/[%_\\,()]/g, "").slice(0, 80) : "";
  const supabase = await createClient();
  let query = supabase
    .from("societies")
    .select("id, slug, name, status, status_note, verified_at, events_require_review, is_demo, university:universities(short_name, name)")
    .order("status", { ascending: false })
    .order("name")
    .limit(200);
  if (q) query = query.ilike("name", `%${q}%`);
  const { data } = await query;

  return (
    <>
      <PageHeader title="Societies" description="Suspend societies that break the rules, and mark established ones as trusted to publish without review." />
      <form method="get" className="mb-6 max-w-sm">
        <label htmlFor="as-q" className="sr-only">
          Search societies
        </label>
        <input
          id="as-q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search by name"
          className="h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
        />
      </form>
      <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
        {(data ?? []).map((s) => (
          <li key={s.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-medium">
                <Link href={`/societies/${s.slug}`} className="hover:underline">
                  {s.name}
                </Link>
                {s.is_demo ? <SampleBadge /> : null}
              </p>
              <p className="text-sm text-muted-foreground">
                {s.university?.short_name ?? s.university?.name} · verified {s.verified_at ? formatDate(s.verified_at) : "—"}
              </p>
              {s.status === "suspended" && s.status_note ? <p className="mt-1 text-sm text-destructive">Suspended: {s.status_note}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/manage/${s.slug}`} className="text-sm font-medium text-primary hover:underline">
                Open workspace
              </Link>
              <ToneBadge tone={s.status === "active" ? "positive" : "negative"} dot>
                {s.status === "active" ? "Active" : "Suspended"}
              </ToneBadge>
              <ToneBadge tone={s.events_require_review ? "neutral" : "info"}>{s.events_require_review ? "Events reviewed" : "Trusted"}</ToneBadge>
              <ActionButton size="sm" variant="outline" action={setSocietyReviewPolicy.bind(null, s.id, !s.events_require_review)}>
                {s.events_require_review ? "Trust to publish" : "Require review"}
              </ActionButton>
              {s.status === "active" ? (
                <ActionButton
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  action={setSocietyStatus.bind(null, s.id, "suspended")}
                  confirm={{ title: `Suspend ${s.name}?`, body: "Its profile and events are hidden and its team can't make changes.", confirmLabel: "Suspend", destructive: true, note: { label: "Reason (shown to the society)", required: true } }}
                >
                  Suspend
                </ActionButton>
              ) : (
                <ActionButton size="sm" variant="outline" action={setSocietyStatus.bind(null, s.id, "active")} confirm={{ title: `Reinstate ${s.name}?`, confirmLabel: "Reinstate", note: { label: "Note", required: true } }}>
                  Reinstate
                </ActionButton>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
