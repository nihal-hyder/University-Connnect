import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader, Section, Stat, StatRow } from "@/components/layout/dashboard-shell";
import { TrendChart } from "@/components/manage/trend-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireSocietyAccess } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Analytics" };

type SocietyAnalytics = {
  published_events: number;
  unique_visitors: number;
  registrations: number;
  confirmed: number;
  cancellations: number;
  attendance: number;
  volunteer_applications: number;
  offers_sent: number;
  offers_accepted: number;
  shortlisted_or_better: number;
  weekly: { week: string; registrations: number; attendance: number; visitors: number; volunteer_applications: number }[];
  events: {
    id: string;
    title: string;
    status: string;
    starts_at: string | null;
    capacity: number | null;
    confirmed: number;
    registrations: number;
    cancellations: number;
    attendance: number;
    unique_visitors: number;
    volunteer_applications: number;
  }[];
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : "—");
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default async function SocietyAnalyticsPage({ params, searchParams }: PageProps<"/manage/[slug]/analytics">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireSocietyAccess(slug, "view_analytics");
  const today = new Date();
  const to = typeof sp.to === "string" && DATE.test(sp.to) ? sp.to : iso(today);
  const from = typeof sp.from === "string" && DATE.test(sp.from) ? sp.from : iso(new Date(today.getTime() - 89 * 86400000));

  const supabase = await createClient();
  const [{ data, error }, startsRes] = await Promise.all([
    supabase.rpc("society_analytics", { p_society: ctx.society.id, p_from: from, p_to: to }),
    supabase.rpc("society_registration_starts", { p_society: ctx.society.id, p_from: from, p_to: to }),
  ]);
  const starts = Number(startsRes.data ?? 0);
  const a = data as unknown as SocietyAnalytics | null;
  const hasActivity = a ? a.weekly.some((w) => w.registrations || w.attendance || w.visitors) : false;

  return (
    <>
      <PageHeader title="Analytics" description="Counts from your own records. Nothing here is estimated." />
      <form method="get" className="mb-8 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor="an-from" className="text-sm font-medium">
            From
          </label>
          <Input id="an-from" name="from" type="date" defaultValue={from} className="w-44" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="an-to" className="text-sm font-medium">
            To
          </label>
          <Input id="an-to" name="to" type="date" defaultValue={to} className="w-44" />
        </div>
        <Button type="submit" variant="outline">
          Update
        </Button>
        <span className="text-sm text-muted-foreground">Up to 400 days.</span>
      </form>

      {error || !a ? (
        <EmptyState title="Analytics unavailable" description={error?.message?.includes("400 days") ? "Choose a range of up to 400 days." : "We couldn't load analytics. Check the dates and try again."} />
      ) : (
        <>
          <StatRow>
            <Stat label="Events published" value={a.published_events} hint="In this period" />
            <Stat label="Registrations" value={a.registrations} hint={`${pct(a.registrations, starts)} of ${starts} form openings · ${a.cancellations} cancelled`} />
            <Stat label="Attended" value={a.attendance} hint={`${pct(a.attendance, a.confirmed)} of confirmed`} />
            <Stat label="Volunteer applications" value={a.volunteer_applications} hint={`${pct(a.offers_accepted, a.offers_sent)} of offers accepted`} />
          </StatRow>

          <Section title="Week by week" className="mt-10">
            {hasActivity ? (
              <TrendChart
                title="Registrations and check-ins per week"
                data={a.weekly}
                xKey="week"
                xFormat="week"
                series={[
                  { key: "registrations", label: "Registrations", color: "var(--chart-1)" },
                  { key: "attendance", label: "Check-ins", color: "var(--chart-2)" },
                ]}
              />
            ) : (
              <EmptyState compact title="No activity in this period" description="Try a wider date range. Registrations and check-ins show up here as they happen." />
            )}
          </Section>

          <Section title="Volunteer pipeline" className="mt-10">
            <dl className="grid grid-cols-2 gap-6 rounded-xl border border-border bg-surface p-5 text-sm sm:grid-cols-4">
              <Stat label="Applications" value={a.volunteer_applications} />
              <Stat label="Shortlisted or further" value={a.shortlisted_or_better} hint={`${pct(a.shortlisted_or_better, a.volunteer_applications)} selection rate`} />
              <Stat label="Offers sent" value={a.offers_sent} />
              <Stat label="Offers accepted" value={a.offers_accepted} hint={`${pct(a.offers_accepted, a.offers_sent)} acceptance`} />
            </dl>
          </Section>

          <Section title="By event" description="All submitted events, regardless of the dates above." className="mt-10">
            {a.events.length ? (
              <div className="overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full min-w-[46rem] text-sm">
                  <thead className="border-b border-border text-left text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 font-medium">Event</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-medium">Visitors</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-medium">Registrations</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-medium">Conversion</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-medium">Attended</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-medium">Volunteers applied</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {a.events.map((e) => (
                      <tr key={e.id}>
                        <td className="px-4 py-2.5">
                          <Link href={`/manage/${slug}/events/${e.id}/analytics`} className="font-medium hover:underline">
                            {e.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">{e.starts_at ? formatDate(e.starts_at) : "No date"}</p>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{e.unique_visitors}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{e.registrations}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{pct(e.registrations, e.unique_visitors)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{e.attendance}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{e.volunteer_applications}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState compact title="No submitted events yet" />
            )}
          </Section>

          <p className="mt-10 max-w-2xl text-sm leading-6 text-muted-foreground">
            <span className="font-medium text-foreground">Definitions.</span> Visitors are anonymous daily-unique visits to event pages.
            A form opening is a visitor who opened a registration form (counted anonymously, once a day). A registration is a completed submission; it is not attendance. Attendance is a check-in. Conversion is registrations ÷
            visitors. Selection rate is applications that reached shortlist or beyond ÷ applications.
          </p>
        </>
      )}
    </>
  );
}
