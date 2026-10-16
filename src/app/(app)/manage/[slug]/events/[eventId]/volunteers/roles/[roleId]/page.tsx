import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/common/action-button";
import { Section } from "@/components/layout/dashboard-shell";
import { NewShiftForm, RoleFormEditor } from "@/components/manage/role-tools";
import { deleteShift } from "@/lib/actions/volunteers";
import { getManagedEvent } from "@/lib/data/manage";
import { parseStoredFields } from "@/lib/forms/schema";
import { formatDateTime, formatTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Volunteer role" };

export default async function RolePage({ params }: PageProps<"/manage/[slug]/events/[eventId]/volunteers/roles/[roleId]">) {
  const { slug, eventId, roleId } = await params;
  const { event, access } = await getManagedEvent(slug, eventId);
  if (!access.manageVolunteers || !/^[0-9a-f-]{36}$/i.test(roleId)) notFound();
  const supabase = await createClient();
  const ctx = { societySlug: slug };

  const { data: role } = await supabase.from("volunteer_roles").select("id, title, positions, accepted_count, status").eq("id", roleId).eq("event_id", event.id).maybeSingle();
  if (!role) notFound();

  const [{ data: form }, { data: shifts }] = await Promise.all([
    supabase.from("form_versions").select("id, fields").eq("volunteer_role_id", role.id).order("version", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("volunteer_shifts").select("id, title, starts_at, ends_at, location, instructions, capacity, assignments:volunteer_shift_assignments(count)").eq("role_id", role.id).order("starts_at"),
  ]);
  const { count: submissions } = form
    ? await supabase.from("volunteer_applications").select("id", { count: "exact", head: true }).eq("form_version_id", form.id)
    : { count: 0 };

  return (
    <>
      <Link href={`/manage/${slug}/events/${event.id}/volunteers`} className="text-sm text-muted-foreground hover:text-foreground">
        ← Volunteers
      </Link>
      <h2 className="mt-4 font-display text-3xl">{role.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {role.accepted_count} of {role.positions} positions filled. Role details are edited in the event&rsquo;s Volunteers step.
      </p>

      <div className="mt-8 grid gap-10 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Section title="Application form" description="Questions applicants answer for this role. Their name and email come from their account.">
          <RoleFormEditor roleId={role.id} societySlug={slug} initial={parseStoredFields(form?.fields ?? [])} hasSubmissions={(submissions ?? 0) > 0} />
        </Section>

        <Section title="Shifts">
          {shifts?.length ? (
            <ul className="mb-4 divide-y divide-border rounded-xl border border-border bg-surface text-sm">
              {shifts.map((s) => {
                const count = Array.isArray(s.assignments) ? (s.assignments[0] as { count: number } | undefined)?.count ?? 0 : 0;
                return (
                  <li key={s.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{s.title}</p>
                        <p className="text-muted-foreground">
                          {formatDateTime(s.starts_at)} – {formatTime(s.ends_at)}
                          {s.location ? ` · ${s.location}` : ""}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {count}
                          {s.capacity ? ` / ${s.capacity}` : ""} assigned{s.capacity && count >= s.capacity ? " · full" : ""}
                        </p>
                      </div>
                      <ActionButton size="sm" variant="ghost" action={deleteShift.bind(null, s.id, ctx)} confirm={{ title: `Delete "${s.title}"?`, body: "Assigned volunteers lose this shift.", confirmLabel: "Delete", destructive: true }}>
                        Delete
                      </ActionButton>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-muted-foreground">No shifts yet. Assign accepted volunteers from their application page.</p>
          )}
          <NewShiftForm roleId={role.id} societySlug={slug} />
        </Section>
      </div>
    </>
  );
}
