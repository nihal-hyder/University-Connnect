import { TZDate } from "@date-fns/tz";
import { format, formatDistanceToNowStrict, isSameDay } from "date-fns";
import { siteConfig } from "@/config/site";

const TZ = siteConfig.defaultTimeZone;

function inZone(value: string | Date, timeZone: string = TZ) {
  return new TZDate(typeof value === "string" ? new Date(value) : value, timeZone);
}

function lowerMeridiem(value: string) {
  return value.replace(/\b(AM|PM)\b/g, (m) => m.toLowerCase());
}

/** "Sat, 14 Nov 2026" */
export function formatDate(value: string | Date | null | undefined, timeZone?: string) {
  if (!value) return "Date to be announced";
  return format(inZone(value, timeZone), "EEE, d MMM yyyy");
}

/** "14 Nov" */
export function formatShortDate(value: string | Date | null | undefined, timeZone?: string) {
  if (!value) return "TBA";
  return format(inZone(value, timeZone), "d MMM");
}

/** "4:30 pm" */
export function formatTime(value: string | Date | null | undefined, timeZone?: string) {
  if (!value) return "";
  return lowerMeridiem(format(inZone(value, timeZone), "h:mm a"));
}

export function formatDateTime(value: string | Date | null | undefined, timeZone?: string) {
  if (!value) return "Not set";
  return `${formatDate(value, timeZone)}, ${formatTime(value, timeZone)}`;
}

/** "Sat, 14 Nov 2026 · 10:00 am – 5:00 pm PKT" (handles multi-day ranges) */
export function formatEventRange(start: string | null, end: string | null, timeZone: string = TZ) {
  if (!start) return "Date to be announced";
  const s = inZone(start, timeZone);
  const zoneLabel = timeZone === "Asia/Karachi" ? "PKT" : timeZone;
  if (!end) return `${format(s, "EEE, d MMM yyyy")} · ${formatTime(start, timeZone)} ${zoneLabel}`;
  const e = inZone(end, timeZone);
  if (isSameDay(s, e)) {
    return `${format(s, "EEE, d MMM yyyy")} · ${formatTime(start, timeZone)} – ${formatTime(end, timeZone)} ${zoneLabel}`;
  }
  return `${lowerMeridiem(format(s, "d MMM, h:mm a"))} – ${lowerMeridiem(format(e, "d MMM yyyy, h:mm a"))} ${zoneLabel}`;
}

/** Calendar block parts for the editorial date stamp. */
export function dateParts(value: string | null, timeZone: string = TZ) {
  if (!value) return null;
  const d = inZone(value, timeZone);
  return { day: format(d, "d"), month: format(d, "MMM"), weekday: format(d, "EEE"), year: format(d, "yyyy") };
}

export function relativeFromNow(value: string | Date) {
  return formatDistanceToNowStrict(typeof value === "string" ? new Date(value) : value, { addSuffix: true });
}

export function formatMoney(amount: number | string | null | undefined, currency: string = siteConfig.defaultCurrency) {
  if (amount === null || amount === undefined || amount === "") return null;
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return null;
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency,
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

/** Convert a <input type="datetime-local"> value (interpreted in PKT) to ISO. */
export function localInputToIso(value: string | null | undefined, timeZone: string = TZ): string | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  const d = new TZDate(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), 0, timeZone);
  return new Date(d.getTime()).toISOString();
}

/** Convert ISO to a value usable by <input type="datetime-local"> in PKT. */
export function isoToLocalInput(value: string | null | undefined, timeZone: string = TZ): string {
  if (!value) return "";
  return format(inZone(value, timeZone), "yyyy-MM-dd'T'HH:mm");
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count.toLocaleString("en-PK")} ${count === 1 ? singular : plural}`;
}

/** True when the timestamp is in the past (null = false). Evaluated per request. */
export function isPast(value: string | null | undefined) {
  return value ? new Date(value).getTime() <= Date.now() : false;
}

/** True when the timestamp is in the future (null = false). */
export function isFuture(value: string | null | undefined) {
  return value ? new Date(value).getTime() > Date.now() : false;
}

/** True when the timestamp is older than `ms` milliseconds (null = true). */
export function olderThan(value: string | null | undefined, ms: number) {
  return value ? Date.now() - new Date(value).getTime() > ms : true;
}
