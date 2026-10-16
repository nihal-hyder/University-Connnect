import type { Metadata } from "next";
import { Search } from "lucide-react";
import { ActionButton } from "@/components/common/action-button";
import { Section, Stat, StatRow } from "@/components/layout/dashboard-shell";
import { CheckInScanner } from "@/components/manage/check-in-scanner";
import { manualCheckIn } from "@/lib/actions/events";
import { requireEventAccess } from "@/lib/data/manage";
import { formatTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Check-in" };

export default async function CheckInPage({ params, searchParams }: PageProps<"/manage/[slug]/events/[eventId]/check-in">) {
  const { slug, eventId } = await params;
  const { q: rawQ } = await searchParams;
  const q = typeof rawQ === "string" ? rawQ.trim().replace(/[%_\\,()*]/g, "").slice(0, 60) : "";
  const { event, access } = await requireEventAccess(slug, eventId, "checkIn");
  const supabase = await createClient();
  const actx = { societySlug: slug, eventSlug: event.slug };

  const [{ count: attended }, list] = await Promise.all([
    supabase.from("attendance_records").select("id", { count: "exact", head: true }).eq("event_id", event.id),
    // Names are only listed to members who may also see registrations.
    access.viewRegistrations && q
      ? supabase
          .from("registrations")
          .select("id, reference_code, team_name, user:profiles!registrations_user_id_fkey!inner(full_name), attendance:attendance_records(checked_in_at)")
          .eq("event_id", event.id)
          .eq("status", "confirmed")
          .or(`full_name.ilike.%${q}%`, { referencedTable: "user" })
          .limit(30)
      : Promise.resolve({ data: null }),
  ]);

  const confirmed = event.confirmed_count;

  return (
    <>
      <StatRow className="mb-8 sm:grid-cols-3">
        <Stat label="Checked in" value={attended ?? 0} />
        <Stat label="Confirmed" value={confirmed} />
        <Stat label="Attendance rate" value={confirmed ? `${Math.round(((attended ?? 0) / confirmed) * 100)}%` : "—"} hint="Checked in ÷ confirmed" />
      </StatRow>

      <CheckInScanner eventId={event.id} />

      {access.viewRegistrations ? (
        <Section title="Find by name" description="For people without their phone. Only confirmed registrations are listed." className="mt-12">
          <form method="get" className="relative max-w-md">
            <label htmlFor="ci-q" className="sr-only">
              Search confirmed participants
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              id="ci-q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Type a name and press Enter"
              className="h-10 w-full rounded-lg border border-input bg-surface pr-3 pl-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            />
          </form>
          {list.data ? (
            list.data.length ? (
              <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-surface">
                {list.data.map((r) => {
                  const at = Array.isArray(r.attendance) ? r.attendance[0]?.checked_in_at : (r.attendance as { checked_in_at: string } | null)?.checked_in_at;
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-4 px-4 py-3">
                      <div>
                        <p className="font-medium">{r.user.full_name}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {r.reference_code}
                          {r.team_name ? ` · ${r.team_name}` : ""}
                        </p>
                      </div>
                      {at ? (
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-success">In at {formatTime(at)}</span>
                          <ActionButton size="sm" variant="ghost" action={manualCheckIn.bind(null, r.id, true, actx)} confirm={{ title: "Undo this check-in?", confirmLabel: "Undo" }}>
                            Undo
                          </ActionButton>
                        </div>
                      ) : (
                        <ActionButton size="sm" action={manualCheckIn.bind(null, r.id, false, actx)}>
                          Check in
                        </ActionButton>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">No confirmed participant matches &ldquo;{q}&rdquo;.</p>
            )
          ) : null}
        </Section>
      ) : null}
    </>
  );
}
