import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Megaphone } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Section } from "@/components/layout/dashboard-shell";
import { AnnouncementComposer, type AudienceOption } from "@/components/manage/announcement-composer";
import { getManagedEvent } from "@/lib/data/manage";
import { formatDateTime, formatTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Announcements" };

const AUDIENCE_LABELS: Record<string, string> = {
  all_registrants: "Everyone registered (confirmed, pending, waitlisted)",
  confirmed: "Confirmed participants",
  waitlisted: "Waitlist",
  pending: "Awaiting approval",
  accepted_volunteers: "Confirmed volunteers",
  all_volunteers: "All volunteer applicants in progress",
  shift: "Volunteers on one shift",
};

export default async function AnnouncementsPage({ params }: PageProps<"/manage/[slug]/events/[eventId]/announcements">) {
  const { slug, eventId } = await params;
  const { event, access } = await getManagedEvent(slug, eventId);
  // Host society only (enforced in SQL too).
  const canRegistrants = access.isHost && access.manageRegistrations;
  const canVolunteers = access.isHost && access.manageVolunteers;
  if (!canRegistrants && !canVolunteers) notFound();
  const supabase = await createClient();

  const [history, volunteerCounts, shifts] = await Promise.all([
    supabase
      .from("event_announcements")
      .select("id, audience, title, body, recipients, send_email, created_at, author:profiles(full_name)")
      .eq("event_id", event.id)
      .order("created_at", { ascending: false })
      .limit(50),
    canVolunteers ? supabase.from("volunteer_applications").select("status").eq("event_id", event.id) : Promise.resolve({ data: [] as { status: string }[] }),
    canVolunteers
      ? supabase.from("volunteer_shifts").select("id, title, starts_at, ends_at").eq("event_id", event.id).order("starts_at")
      : Promise.resolve({ data: [] as { id: string; title: string; starts_at: string; ends_at: string }[] }),
  ]);

  const v = volunteerCounts.data ?? [];
  const inProgress = ["submitted", "under_review", "shortlisted", "interview_requested", "offered", "waitlisted", "accepted"];
  const audiences: AudienceOption[] = [
    ...(canRegistrants
      ? [
          { value: "all_registrants", label: AUDIENCE_LABELS.all_registrants, count: event.confirmed_count + event.pending_count + event.waitlist_count },
          { value: "confirmed", label: AUDIENCE_LABELS.confirmed, count: event.confirmed_count },
          { value: "waitlisted", label: AUDIENCE_LABELS.waitlisted, count: event.waitlist_count },
          { value: "pending", label: AUDIENCE_LABELS.pending, count: event.pending_count },
        ]
      : []),
    ...(canVolunteers
      ? [
          { value: "accepted_volunteers", label: AUDIENCE_LABELS.accepted_volunteers, count: v.filter((a) => a.status === "accepted").length },
          { value: "all_volunteers", label: AUDIENCE_LABELS.all_volunteers, count: v.filter((a) => inProgress.includes(a.status)).length },
          ...((shifts.data ?? []).length ? [{ value: "shift", label: AUDIENCE_LABELS.shift, count: 0 }] : []),
        ]
      : []),
  ];

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Section title="New announcement" description="For updates people need: venue or time changes, what to bring, check-in instructions.">
        <AnnouncementComposer
          eventId={event.id}
          societySlug={slug}
          audiences={audiences}
          shifts={(shifts.data ?? []).map((s) => ({ id: s.id, label: `${s.title} · ${formatDateTime(s.starts_at)}–${formatTime(s.ends_at)}` }))}
        />
      </Section>
      <Section title="Sent">
        {history.data?.length ? (
          <ul className="space-y-3">
            {history.data.map((a) => (
              <li key={a.id} className="rounded-xl border border-border bg-surface p-4">
                <p className="font-medium">{a.title}</p>
                <p className="mt-1 line-clamp-3 text-sm leading-6 whitespace-pre-line text-foreground/85">{a.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDateTime(a.created_at)} · {AUDIENCE_LABELS[a.audience] ?? a.audience} · {a.recipients} recipient{a.recipients === 1 ? "" : "s"}
                  {a.send_email ? " · in-app + email" : " · in-app"}
                  {a.author?.full_name ? ` · by ${a.author.full_name}` : ""}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState compact icon={<Megaphone />} title="No announcements yet" description="Messages you send appear here with how many people received them." />
        )}
      </Section>
    </div>
  );
}
