import type { RegistrationMode, ScheduleStatus, Tone } from "./labels";

export type RegistrationStateInput = {
  registration_mode: RegistrationMode;
  schedule_status: ScheduleStatus;
  starts_at: string | null;
  ends_at: string | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  capacity: number | null;
  confirmed_count: number;
  waitlist_enabled: boolean;
};

export type RegistrationState =
  | "open"
  | "waitlist"
  | "full"
  | "not_open"
  | "closed"
  | "ended"
  | "cancelled"
  | "postponed"
  | "no_registration"
  | "external";

/**
 * Mirrors the checks in public.register_for_event(). The database remains the
 * authority; this only decides what the UI shows.
 */
export function getRegistrationState(e: RegistrationStateInput, now: Date = new Date()): RegistrationState {
  const t = now.getTime();
  if (e.schedule_status === "cancelled") return "cancelled";
  if (e.ends_at && new Date(e.ends_at).getTime() <= t) return "ended";
  if (e.schedule_status === "postponed") return "postponed";
  if (e.registration_mode === "none") return "no_registration";
  if (e.registration_opens_at && new Date(e.registration_opens_at).getTime() > t) return "not_open";
  const closes = e.registration_closes_at ?? e.starts_at ?? e.ends_at;
  if (closes && new Date(closes).getTime() <= t) return "closed";
  if (e.registration_mode === "external") return "external";
  if (e.capacity !== null && e.confirmed_count >= e.capacity) return e.waitlist_enabled ? "waitlist" : "full";
  return "open";
}

export const REGISTRATION_STATE_COPY: Record<RegistrationState, { label: string; tone: Tone }> = {
  open: { label: "Registration open", tone: "positive" },
  waitlist: { label: "Full · waitlist open", tone: "info" },
  full: { label: "Fully booked", tone: "negative" },
  not_open: { label: "Registration opens soon", tone: "neutral" },
  closed: { label: "Registration closed", tone: "neutral" },
  ended: { label: "Event ended", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "negative" },
  postponed: { label: "Postponed", tone: "warning" },
  no_registration: { label: "No registration needed", tone: "neutral" },
  external: { label: "Register on organiser's site", tone: "positive" },
};

export function seatsLeft(e: Pick<RegistrationStateInput, "capacity" | "confirmed_count">): number | null {
  if (e.capacity === null) return null;
  return Math.max(0, e.capacity - e.confirmed_count);
}
