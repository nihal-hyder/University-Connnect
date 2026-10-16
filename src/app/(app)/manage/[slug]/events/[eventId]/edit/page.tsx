import type { Metadata } from "next";
import { EventWizard } from "@/components/manage/event-wizard";
import { requireEventAccess, getWizardData } from "@/lib/data/manage";
import { eventToFormValues } from "@/lib/events/event-values";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit event" };

export default async function EditEventPage({ params }: PageProps<"/manage/[slug]/events/[eventId]/edit">) {
  const { slug, eventId } = await params;
  const { ctx, event, access } = await requireEventAccess(slug, eventId, "edit");
  const supabase = await createClient();
  const [data, privateDetails] = await Promise.all([getWizardData(ctx, event.id), supabase.rpc("event_private_details", { p_event: event.id })]);
  const onlineUrl = (privateDetails.data as { online_url?: string | null } | null)?.online_url ?? null;
  const existing = data.existing!;

  return (
    <>
      {event.status === "published" ? (
        <p className="mb-8 rounded-lg bg-info-soft px-4 py-3 text-sm text-info">
          Changes go live immediately. If you change the time or venue, registered participants are notified automatically.
        </p>
      ) : null}
      <EventWizard
        society={{ id: event.society_id, slug, name: event.host.name, eventsRequireReview: data.eventsRequireReview }}
        directory={data.directory}
        defaults={eventToFormValues(event, { targets: existing.targets, formFields: existing.formFields, roles: existing.roles, onlineUrl })}
        status={event.status}
        formHasSubmissions={existing.formHasSubmissions}
        permissions={{
          publish: access.publish,
          manageVolunteers: access.manageVolunteers,
          manageCollaborations: access.manageCollaborations,
          isHost: access.isHost,
        }}
        collabSocieties={data.collabSocieties}
      />
    </>
  );
}
