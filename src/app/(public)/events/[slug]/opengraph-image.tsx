import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";
import { getEventBySlug } from "@/lib/data/event-detail";
import { EVENT_FORMAT_LABELS, EVENT_TYPE_LABELS } from "@/lib/events/labels";
import { getRegistrationState, REGISTRATION_STATE_COPY } from "@/lib/events/registration-state";
import { formatEventRange, formatMoney } from "@/lib/format";
import { EventCard, OG_SIZE, ogFonts, SiteCard } from "@/lib/og";
import { mediaUrl } from "@/lib/storage";

export const alt = `Event on ${siteConfig.name}`;
export const size = OG_SIZE;
export const contentType = "image/png";

/** Preview card for WhatsApp and social links. Only public events are described. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const fonts = await ogFonts();
  const data = await getEventBySlug(slug);
  const e = data?.event;
  const isPublic = e && e.status === "published" && (!e.publish_at || new Date(e.publish_at) <= new Date()) && e.society?.status === "active";
  if (!e || !isPublic) return new ImageResponse(<SiteCard />, { ...size, fonts });

  const state = REGISTRATION_STATE_COPY[getRegistrationState(e)];
  const where =
    e.format === "online"
      ? "Online"
      : [e.venue, e.university?.short_name ?? e.university?.name, e.city?.name].filter(Boolean).join(", ") || EVENT_FORMAT_LABELS[e.format];
  const fee = e.is_free ? "Free" : (formatMoney(e.fee_amount, e.fee_currency) ?? "Paid");

  return new ImageResponse(
    (
      <EventCard
        eyebrow={`${EVENT_TYPE_LABELS[e.event_type]} · ${e.society?.name ?? ""}`}
        title={e.title}
        when={formatEventRange(e.starts_at, e.ends_at, e.timezone)}
        where={where}
        coverUrl={mediaUrl(e.cover_path)}
        pills={[
          { label: state.label, tone: state.tone === "positive" ? "green" : state.tone === "negative" ? "signal" : "neutral" },
          { label: fee, tone: "neutral" },
          ...(e.volunteer_recruitment_open ? [{ label: "Volunteers wanted", tone: "signal" as const }] : []),
        ]}
      />
    ),
    { ...size, fonts },
  );
}
