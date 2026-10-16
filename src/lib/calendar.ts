/**
 * Calendar exports: RFC 5545 .ics files plus Google Calendar and Outlook links.
 * Times are always written in UTC, so every calendar app shows the correct
 * local time (Pakistan or elsewhere).
 */

export type CalendarItem = {
  uid: string;
  title: string;
  start: string; // ISO
  end: string | null; // ISO; defaults to start + 2h
  location?: string | null;
  description?: string | null;
  url?: string | null;
};

function endOf(item: CalendarItem) {
  return item.end ?? new Date(new Date(item.start).getTime() + 2 * 3600 * 1000).toISOString();
}

/** 2026-11-05T04:00:00.000Z -> 20261105T040000Z */
export function icsDate(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 octets are folded with CRLF + space (RFC 5545 §3.1). */
function fold(line: string) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let current = "";
  let size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > (out.length ? 74 : 75)) {
      out.push(current);
      current = "";
      size = 0;
    }
    current += ch;
    size += n;
  }
  out.push(current);
  return out.join("\r\n ");
}

export function buildIcs(items: CalendarItem[], calendarName = "CampusConnect") {
  const now = icsDate(new Date().toISOString());
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CampusConnect//Events//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${escapeIcs(calendarName)}`];
  for (const item of items) {
    const description = [item.description, item.url].filter(Boolean).join("\n\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${item.uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${icsDate(item.start)}`,
      `DTEND:${icsDate(endOf(item))}`,
      `SUMMARY:${escapeIcs(item.title)}`,
    );
    if (item.location) lines.push(`LOCATION:${escapeIcs(item.location)}`);
    if (description) lines.push(`DESCRIPTION:${escapeIcs(description)}`);
    if (item.url) lines.push(`URL:${item.url}`);
    lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escapeIcs(item.title)}`, "TRIGGER:-PT1H", "END:VALARM", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function googleCalendarUrl(item: CalendarItem) {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: item.title,
    dates: `${icsDate(item.start)}/${icsDate(endOf(item))}`,
    details: [item.description, item.url].filter(Boolean).join("\n\n"),
    location: item.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export function outlookCalendarUrl(item: CalendarItem) {
  const p = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: item.title,
    startdt: new Date(item.start).toISOString(),
    enddt: endOf(item),
    body: [item.description, item.url].filter(Boolean).join("\n\n"),
    location: item.location ?? "",
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${p.toString()}`;
}
