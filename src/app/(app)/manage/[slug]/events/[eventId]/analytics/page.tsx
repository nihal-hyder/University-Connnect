import type { Metadata } from "next";
import { EmptyState } from "@/components/common/empty-state";
import { Section, Stat, StatRow } from "@/components/layout/dashboard-shell";
import { TrendChart } from "@/components/manage/trend-chart";
import { requireEventAccess } from "@/lib/data/manage";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Event analytics" };

type EventAnalytics = {
  capacity: number | null;
  confirmed: number;
  pending: number;
  waitlisted: number;
  registrations: number;
  cancellations: number;
  attendance: number;
  unique_visitors: number;
  saves: number;
  daily: { day: string; visitors: number; registrations: number }[];
  checkins_by_hour: { hour: string; count: number }[];
  volunteers: { role: string; positions: number; accepted: number; applications: number }[];
};

const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : "—");

export default async function EventAnalyticsPage({ params }: PageProps<"/manage/[slug]/events/[eventId]/analytics">) {
  const { slug, eventId } = await params;
  const { event } = await requireEventAccess(slug, eventId, "viewAnalytics");
  const supabase = await createClient();
  const [{ data, error }, funnel] = await Promise.all([
    supabase.rpc("event_analytics", { p_event: event.id }),
    supabase.rpc("event_funnel", { p_event: event.id }),
  ]);
  const starts = Number((funnel.data as { starts?: number } | null)?.starts ?? 0);
  if (error || !data) {
    return <EmptyState title="Analytics unavailable" description="We couldn't load analytics for this event. Try again shortly." />;
  }
  const a = data as unknown as EventAnalytics;
  const hasTraffic = a.daily.some((d) => d.visitors > 0 || d.registrations > 0);

  return (
    <>
      <StatRow>
        <Stat label="Unique visitors" value={a.unique_visitors} hint="Distinct visitors per day, summed" />
        <Stat label="Registrations" value={a.registrations} hint={`${pct(a.registrations, a.unique_visitors)} of visitors`} />
        <Stat label="Confirmed" value={a.confirmed} hint={a.capacity ? `${pct(a.confirmed, a.capacity)} of capacity` : "No capacity limit"} />
        <Stat label="Attended" value={a.attendance} hint={`${pct(a.attendance, a.confirmed)} of confirmed`} />
      </StatRow>
      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Cancelled</dt>
          <dd className="tabular-nums">{a.cancellations}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Awaiting approval</dt>
          <dd className="tabular-nums">{a.pending}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Waitlisted</dt>
          <dd className="tabular-nums">{a.waitlisted}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Saved by students</dt>
          <dd className="tabular-nums">{a.saves}</dd>
        </div>
      </dl>

      <Section title="Funnel" className="mt-10" description="Each step as a share of the step before it.">
        <ol className="space-y-2.5">
          {[
            { label: "Unique visitors", value: a.unique_visitors },
            { label: "Opened the registration form", value: starts },
            { label: "Submitted a registration", value: a.registrations },
            { label: "Confirmed", value: a.confirmed },
            { label: "Attended", value: a.attendance },
          ].map((step, i, all) => {
            const max = Math.max(1, ...all.map((x) => x.value));
            return (
              <li key={step.label} className="grid grid-cols-[minmax(0,13rem)_1fr_6rem] items-center gap-3 text-sm">
                <span className="truncate text-muted-foreground">{step.label}</span>
                <span className="h-2.5 rounded-r-full bg-[var(--chart-1)]" style={{ width: `${(step.value / max) * 100}%`, minWidth: step.value ? 4 : 0 }} aria-hidden />
                <span className="text-right tabular-nums">
                  {step.value}
                  {i > 0 ? <span className="ml-1.5 text-xs text-muted-foreground">{pct(step.value, all[i - 1].value)}</span> : null}
                </span>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section title="Visitors and registrations by day" className="mt-10">
        {hasTraffic ? (
          <TrendChart
            title="Daily counts"
            data={a.daily}
            xKey="day"
            xFormat="day"
            series={[
              { key: "visitors", label: "Unique visitors", color: "var(--chart-1)" },
              { key: "registrations", label: "Registrations", color: "var(--chart-2)" },
            ]}
          />
        ) : (
          <EmptyState compact title="No activity recorded yet" description="Visits are counted once the event is published. Registrations appear as they come in." />
        )}
      </Section>

      {a.volunteers.length ? (
        <Section title="Volunteer roles" className="mt-10">
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[28rem] text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">Role</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Applications</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Filled</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {a.volunteers.map((v) => (
                  <tr key={v.role}>
                    <td className="px-4 py-2.5">{v.role}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{v.applications}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {v.accepted} / {v.positions}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{Math.max(0, v.positions - v.accepted)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}

      {a.checkins_by_hour.length ? (
        <Section title="Check-ins by hour" className="mt-10">
          <ul className="space-y-1.5 text-sm">
            {a.checkins_by_hour.map((h) => {
              const max = Math.max(...a.checkins_by_hour.map((x) => x.count));
              return (
                <li key={h.hour} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-3">
                  <span className="text-muted-foreground tabular-nums">{h.hour.slice(5)}</span>
                  <span className="h-2 rounded-r-full bg-[var(--chart-1)]" style={{ width: `${(h.count / max) * 100}%` }} aria-hidden />
                  <span className="text-right tabular-nums">{h.count}</span>
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

      <Section title="How these are measured" className="mt-12">
        <dl className="grid gap-4 text-sm leading-6 text-muted-foreground sm:grid-cols-2">
          <div>
            <dt className="font-medium text-foreground">Unique visitors</dt>
            <dd>Browsers that opened the public event page, counted once per day using an anonymous daily hash. Not people, and not registrations.</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Registrations</dt>
            <dd>Completed registration submissions in any status, including those later cancelled.</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Opened the registration form</dt>
            <dd>Browsers that opened the form, counted once per day with the same anonymous hash as visits. The gap to registrations shows people who started but didn&rsquo;t submit.</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Confirmed</dt>
            <dd>Registrations currently holding a place.</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Attended</dt>
            <dd>Confirmed participants checked in by ticket scan or manually. Not checked in does not prove absence.</dd>
          </div>
        </dl>
      </Section>
    </>
  );
}
