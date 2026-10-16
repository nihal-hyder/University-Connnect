import Image from "next/image";
import Link from "next/link";
import { MapPin, Monitor, Users } from "lucide-react";
import { EventArt } from "@/components/events/event-art";
import { SampleBadge, ToneBadge } from "@/components/common/tone-badge";
import type { EventListItem } from "@/lib/data/events";
import { EVENT_FORMAT_LABELS, EVENT_TYPE_LABELS } from "@/lib/events/labels";
import { getRegistrationState, REGISTRATION_STATE_COPY, seatsLeft } from "@/lib/events/registration-state";
import { dateParts, formatEventRange, formatMoney } from "@/lib/format";
import { mediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

type LocationFields = { format: EventListItem["format"]; city_name: string | null; university_short: string | null; university_name: string | null };

function locationLabel(e: LocationFields) {
  if (e.format === "online") return "Online";
  const where = e.university_short || e.university_name || e.city_name;
  const base = [where, e.city_name && where !== e.city_name ? e.city_name : null].filter(Boolean).join(", ");
  return e.format === "hybrid" ? `${base} + online` : base || "Venue to be announced";
}

export function EventCard({ event, className, priority = false }: { event: EventListItem; className?: string; priority?: boolean }) {
  const state = getRegistrationState(event);
  const stateCopy = REGISTRATION_STATE_COPY[state];
  const cover = mediaUrl(event.cover_path);
  const left = seatsLeft(event);
  const fee = event.is_free ? "Free" : formatMoney(event.fee_amount, event.fee_currency) ?? "Paid";

  return (
    <article className={cn("group relative flex flex-col", className)}>
      <div className="card-lift relative aspect-[16/10] overflow-hidden rounded-lg bg-muted group-hover:-translate-y-1 group-focus-within:-translate-y-1">
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            priority={priority}
          />
        ) : (
          <EventArt seed={event.slug} category={event.category_slug} className="size-full transition-transform duration-500 group-hover:scale-[1.02]" />
        )}
        <span className="absolute top-3 left-3 rounded-sm bg-surface/95 px-2 py-1 text-[11px] font-medium tracking-wide text-foreground uppercase shadow-xs">
          {EVENT_TYPE_LABELS[event.event_type]}
        </span>
        {event.schedule_status !== "scheduled" ? (
          <span className="absolute top-3 right-3">
            <ToneBadge tone={event.schedule_status === "cancelled" ? "negative" : "warning"} className="bg-surface">
              {event.schedule_status === "cancelled" ? "Cancelled" : "Postponed"}
            </ToneBadge>
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col pt-4">
        <p className="text-[13px] font-medium text-signal-ink">{formatEventRange(event.starts_at, event.ends_at, event.timezone)}</p>
        <h3 className="mt-1.5 font-display text-[1.35rem] leading-snug text-foreground">
          <Link href={`/events/${event.slug}`} className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline">
            {event.title}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {event.society_name}
          {event.category_name ? <span aria-hidden="true"> · </span> : null}
          {event.category_name}
        </p>

        <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-foreground/75">
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Location</dt>
            {event.format === "online" ? <Monitor className="size-3.5" aria-hidden /> : <MapPin className="size-3.5" aria-hidden />}
            <dd>{locationLabel(event)}</dd>
          </div>
          <div>
            <dt className="sr-only">Fee</dt>
            <dd>{fee}</dd>
          </div>
          {left !== null && state === "open" && left <= 15 ? (
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Places left</dt>
              <Users className="size-3.5" aria-hidden />
              <dd>{left} left</dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
          <ToneBadge tone={stateCopy.tone} dot>
            {stateCopy.label}
          </ToneBadge>
          {event.open_roles > 0 ? <ToneBadge tone="accent">Volunteers wanted</ToneBadge> : null}
          {event.is_demo ? <SampleBadge /> : null}
        </div>
      </div>
    </article>
  );
}

/** Compact row with an editorial date stamp, used in dashboards and lists. */
export function EventRow({
  event,
  meta,
  aside,
  className,
}: {
  event: LocationFields & {
    slug: string;
    title: string;
    starts_at: string | null;
    ends_at: string | null;
    timezone: string;
    society_name: string;
    is_demo: boolean;
  };
  meta?: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  const parts = dateParts(event.starts_at, event.timezone);
  return (
    <div className={cn("group relative flex items-start gap-4 py-4", className)}>
      <div className="flex w-12 shrink-0 flex-col items-center rounded-md border border-border bg-surface py-1.5 text-center">
        <span className="text-[10px] font-medium tracking-wider text-signal-ink uppercase">{parts?.month ?? "TBA"}</span>
        <span className="font-display text-xl leading-none">{parts?.day ?? "–"}</span>
      </div>
      <div className="min-w-0 flex-1">
        <Link
          href={`/events/${event.slug}`}
          className="font-medium text-foreground outline-none after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:underline"
        >
          {event.title}
        </Link>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {event.society_name} · {EVENT_FORMAT_LABELS[event.format] === "Online" ? "Online" : locationLabel(event)}
        </p>
        {meta ? <div className="mt-1.5 text-sm">{meta}</div> : null}
        {event.is_demo && aside ? <SampleBadge className="mt-2" /> : null}
      </div>
      {aside ? <div className="relative z-10 shrink-0">{aside}</div> : null}
      {event.is_demo && !aside ? <SampleBadge className="absolute top-4 right-0 hidden sm:inline-flex" /> : null}
    </div>
  );
}
