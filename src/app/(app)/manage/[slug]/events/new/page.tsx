import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { EventWizard } from "@/components/manage/event-wizard";
import { requireSocietyAccess } from "@/lib/auth/session";
import { getWizardData } from "@/lib/data/manage";
import { blankEventValues } from "@/lib/events/event-values";

export const metadata: Metadata = { title: "Create event" };

export default async function NewEventPage({ params }: PageProps<"/manage/[slug]/events/new">) {
  const { slug } = await params;
  const ctx = await requireSocietyAccess(slug, "create_events");
  if (ctx.society.status !== "active") notFound();
  const data = await getWizardData(ctx);

  return (
    <>
      <PageHeader eyebrow={ctx.society.name} title="Create an event" description="Work through the steps in any order. Nothing is public until you submit." />
      <EventWizard
        society={{ id: ctx.society.id, slug, name: ctx.society.name, eventsRequireReview: data.eventsRequireReview }}
        directory={data.directory}
        defaults={blankEventValues(data.defaultUniversityId)}
        status={null}
        formHasSubmissions={false}
        permissions={{
          publish: ctx.can("publish_events"),
          manageVolunteers: ctx.can("manage_volunteers"),
          manageCollaborations: ctx.can("manage_collaborations"),
          isHost: true,
        }}
        collabSocieties={data.collabSocieties}
      />
    </>
  );
}
