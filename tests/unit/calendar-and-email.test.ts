import { describe, expect, it } from "vitest";
import { buildIcs, escapeIcs, googleCalendarUrl, icsDate, outlookCalendarUrl } from "@/lib/calendar";
import { emailMatchesDomains, parseDomains, universityForEmail } from "@/lib/university-email";

const item = {
  uid: "event-1@campusconnect",
  title: "Build for Pakistan, Hackathon; Day 1",
  start: "2026-11-05T04:00:00.000Z",
  end: "2026-11-05T13:00:00.000Z",
  location: "Main Hall, NUST, Islamabad",
  description: "Line one\nLine two",
  url: "https://campus.example/events/build",
};

describe("calendar export", () => {
  it("writes UTC basic-format dates", () => {
    expect(icsDate("2026-11-05T04:00:00.000Z")).toBe("20261105T040000Z");
  });
  it("escapes commas, semicolons, backslashes and newlines", () => {
    expect(escapeIcs("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
  });
  it("produces a valid VCALENDAR with CRLF lines no longer than 75 octets", () => {
    const ics = buildIcs([{ ...item, description: "x".repeat(300) }]);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("DTSTART:20261105T040000Z");
    expect(ics).toContain("SUMMARY:Build for Pakistan\\, Hackathon\\; Day 1");
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
  it("defaults to a two-hour event when there is no end time", () => {
    expect(buildIcs([{ ...item, end: null }])).toContain("DTEND:20261105T060000Z");
  });
  it("builds Google and Outlook links", () => {
    const g = new URL(googleCalendarUrl(item));
    expect(g.hostname).toBe("calendar.google.com");
    expect(g.searchParams.get("dates")).toBe("20261105T040000Z/20261105T130000Z");
    expect(new URL(outlookCalendarUrl(item)).searchParams.get("subject")).toBe(item.title);
  });
});

describe("verified university email", () => {
  const unis = [
    { name: "FAST", email_domains: ["nu.edu.pk"] },
    { name: "NUST", email_domains: ["nust.edu.pk", "seecs.edu.pk"] },
  ];
  it("matches exact domains and subdomains", () => {
    expect(emailMatchesDomains("ali@nu.edu.pk", ["nu.edu.pk"])).toBe(true);
    expect(emailMatchesDomains("ali@lhr.nu.edu.pk", ["nu.edu.pk"])).toBe(true);
    expect(emailMatchesDomains("Ali@SEECS.EDU.PK", ["seecs.edu.pk"])).toBe(true);
  });
  it("rejects look-alike domains and personal email", () => {
    expect(emailMatchesDomains("ali@evilnust.edu.pk", ["nust.edu.pk"])).toBe(false);
    expect(emailMatchesDomains("ali@nust.edu.pk.evil.com", ["nust.edu.pk"])).toBe(false);
    expect(emailMatchesDomains("ali@gmail.com", ["nu.edu.pk"])).toBe(false);
    expect(emailMatchesDomains(null, ["nu.edu.pk"])).toBe(false);
  });
  it("finds the university for an email", () => {
    expect(universityForEmail("x@student.nust.edu.pk", unis)?.name).toBe("NUST");
    expect(universityForEmail("x@yahoo.com", unis)).toBeNull();
  });
  it("parses admin-entered domain lists", () => {
    expect(parseDomains(" @NUST.edu.pk, seecs.edu.pk  nust.edu.pk")).toEqual(["nust.edu.pk", "seecs.edu.pk"]);
    expect(parseDomains("")).toEqual([]);
    expect(parseDomains("not a domain!")).toBeNull();
    expect(parseDomains("https://nust.edu.pk")).toBeNull();
  });
});
