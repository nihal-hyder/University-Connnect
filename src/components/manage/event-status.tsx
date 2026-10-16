import { ToneBadge } from "@/components/common/tone-badge";
import { isFuture } from "@/lib/format";
import { EVENT_STATUS_LABELS, EVENT_STATUS_TONE, type EventStatus, type ScheduleStatus } from "@/lib/events/labels";

/** Publishing status and schedule status are independent; show both when relevant. */
export function EventStatusBadges({
  status,
  scheduleStatus,
  publishAt,
}: {
  status: EventStatus;
  scheduleStatus: ScheduleStatus;
  publishAt?: string | null;
}) {
  const scheduled = status === "published" && isFuture(publishAt);
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <ToneBadge tone={scheduled ? "info" : EVENT_STATUS_TONE[status]} dot>
        {scheduled ? "Scheduled to publish" : EVENT_STATUS_LABELS[status]}
      </ToneBadge>
      {scheduleStatus !== "scheduled" ? (
        <ToneBadge tone={scheduleStatus === "cancelled" ? "negative" : "warning"}>{scheduleStatus === "cancelled" ? "Cancelled" : "Postponed"}</ToneBadge>
      ) : null}
    </span>
  );
}
