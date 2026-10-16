import { describe, expect, it } from "vitest";
import { blankEventValues } from "@/lib/events/event-values";
import { eventFormSchema, publishProblems } from "@/lib/events/event-schema";
import { getRegistrationState, seatsLeft, type RegistrationStateInput } from "@/lib/events/registration-state";
import { answersSchema, cleanAnswers, formFieldsSchema, newFieldId, type FormField } from "@/lib/forms/schema";

const fields: FormField[] = [
  { id: "intro", type: "statement", label: "Read this", required: false },
  { id: "name", type: "short_text", label: "Team name", required: true },
  { id: "track", type: "single_choice", label: "Track", required: true, options: ["AI", "Climate"] },
  { id: "tools", type: "multiple_choice", label: "Tools", required: false, options: ["Python", "Figma"] },
  { id: "age", type: "number", label: "Age", required: false, min: 16, max: 40 },
  { id: "site", type: "url", label: "Portfolio", required: false },
  { id: "agree", type: "consent", label: "I agree", required: true },
];

describe("custom form answers", () => {
  const schema = answersSchema(fields);

  it("accepts valid answers", () => {
    expect(schema.safeParse({ name: "Monsoon", track: "AI", tools: ["Python"], agree: true }).success).toBe(true);
  });
  it("requires required questions and consent", () => {
    const r = schema.safeParse({ name: "", track: "AI", agree: false });
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => i.path[0]);
    expect(paths).toContain("name");
    expect(paths).toContain("agree");
  });
  it("rejects options that were not offered", () => {
    expect(schema.safeParse({ name: "x", track: "Crypto", agree: true }).success).toBe(false);
    expect(schema.safeParse({ name: "x", track: "AI", tools: ["Excel"], agree: true }).success).toBe(false);
  });
  it("enforces number range and https links", () => {
    expect(schema.safeParse({ name: "x", track: "AI", agree: true, age: 12 }).success).toBe(false);
    expect(schema.safeParse({ name: "x", track: "AI", agree: true, site: "javascript:alert(1)" }).success).toBe(false);
  });
  it("drops empty optional answers and statements before saving", () => {
    expect(cleanAnswers(fields, { intro: "x", name: " Monsoon ", track: "AI", tools: [], site: "", agree: true })).toEqual({
      name: "Monsoon",
      track: "AI",
      agree: true,
    });
  });
});

describe("form builder schema", () => {
  it("rejects choice questions without options and duplicate ids", () => {
    expect(formFieldsSchema.safeParse([{ id: "a", type: "dropdown", label: "Pick", required: false, options: [] }]).success).toBe(false);
    expect(
      formFieldsSchema.safeParse([
        { id: "a", type: "short_text", label: "A", required: false },
        { id: "a", type: "short_text", label: "B", required: false },
      ]).success,
    ).toBe(false);
  });
  it("generates unique, safe ids", () => {
    expect(newFieldId("What's your T-shirt size?", [])).toBe("what_s_your_t_shirt_size");
    expect(newFieldId("Email", ["email"])).toBe("email_2");
  });
});

describe("registration state", () => {
  const base: RegistrationStateInput = {
    registration_mode: "individual",
    schedule_status: "scheduled",
    starts_at: new Date(Date.now() + 7 * 864e5).toISOString(),
    ends_at: new Date(Date.now() + 8 * 864e5).toISOString(),
    registration_opens_at: null,
    registration_closes_at: null,
    capacity: 10,
    confirmed_count: 3,
    waitlist_enabled: true,
  };
  it("is open with seats", () => {
    expect(getRegistrationState(base)).toBe("open");
    expect(seatsLeft(base)).toBe(7);
  });
  it("switches to waitlist or full at capacity", () => {
    expect(getRegistrationState({ ...base, confirmed_count: 10 })).toBe("waitlist");
    expect(getRegistrationState({ ...base, confirmed_count: 10, waitlist_enabled: false })).toBe("full");
  });
  it("treats cancellation and postponement independently of publishing", () => {
    expect(getRegistrationState({ ...base, schedule_status: "cancelled" })).toBe("cancelled");
    expect(getRegistrationState({ ...base, schedule_status: "postponed" })).toBe("postponed");
  });
  it("respects the registration window", () => {
    expect(getRegistrationState({ ...base, registration_opens_at: new Date(Date.now() + 864e5).toISOString() })).toBe("not_open");
    expect(getRegistrationState({ ...base, registration_closes_at: new Date(Date.now() - 1000).toISOString() })).toBe("closed");
  });
});

describe("event wizard validation", () => {
  const valid = {
    ...blankEventValues(""),
    title: "Intro to Rust",
    categoryId: "1",
    description: "A practical introduction to Rust for students who already know one programming language.",
    startsAt: "2030-01-10T10:00",
    endsAt: "2030-01-10T13:00",
    venue: "Room 1",
    cityId: "1",
  };
  it("accepts a complete event", () => {
    expect(eventFormSchema.safeParse(valid).success).toBe(true);
    expect(publishProblems(valid)).toEqual([]);
  });
  it("rejects an end before the start", () => {
    const r = eventFormSchema.safeParse({ ...valid, endsAt: "2030-01-10T09:00" });
    expect(r.success).toBe(false);
    expect(r.error!.issues.some((i) => i.path[0] === "endsAt")).toBe(true);
  });
  it("rejects registration closing after the event ends", () => {
    const r = eventFormSchema.safeParse({ ...valid, registrationClosesAt: "2030-01-11T10:00" });
    expect(r.error!.issues.some((i) => i.path[0] === "registrationClosesAt")).toBe(true);
  });
  it("rejects negative or zero capacity", () => {
    expect(eventFormSchema.safeParse({ ...valid, capacity: "0" }).success).toBe(false);
    expect(eventFormSchema.safeParse({ ...valid, capacity: "-5" }).success).toBe(false);
  });
  it("requires a fee description for paid events and team sizes for team events", () => {
    expect(eventFormSchema.safeParse({ ...valid, isFree: false }).success).toBe(false);
    expect(eventFormSchema.safeParse({ ...valid, registrationMode: "team" }).success).toBe(false);
  });
  it("requires an explicit compensation description for paid volunteer roles", () => {
    const role = { title: "Photographer", description: "", responsibilities: "", positions: "1", skills: "", eligibility: "", experienceLevel: "none" as const, timeCommitment: "", scheduleNotes: "", applicationDeadline: "", isPaid: true, compensationDetails: "", benefits: "", selectionProcess: "", requiresEventRegistration: false };
    expect(eventFormSchema.safeParse({ ...valid, roles: [role] }).success).toBe(false);
    expect(eventFormSchema.safeParse({ ...valid, roles: [{ ...role, compensationDetails: "PKR 3,000 per day" }] }).success).toBe(true);
  });
  it("lists what blocks publishing", () => {
    expect(publishProblems({ ...valid, description: "short", categoryId: "" })).toHaveLength(2);
  });
});
