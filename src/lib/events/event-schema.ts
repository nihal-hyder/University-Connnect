import { z } from "zod";
import { formFieldsSchema, type FormField } from "@/lib/forms/schema";

/**
 * Event wizard schema. Shared by the client (step validation) and the server
 * action (authoritative validation). Date-times are <input type="datetime-local">
 * strings interpreted in the event's time zone (Pakistan by default) and are
 * converted to ISO on the server. The database repeats the critical checks.
 */

const text = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters`);
const optionalHttps = z.union([z.literal(""), z.string().trim().max(500).regex(/^https:\/\/\S+$/i, "Use a secure link starting with https://")]);
const localDateTime = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Enter a valid date and time")]);
const intString = (min: number, max: number, label: string) =>
  z.union([z.literal(""), z.string().regex(/^\d+$/, `${label} must be a whole number`)]).refine(
    (v) => v === "" || (Number(v) >= min && Number(v) <= max),
    `${label} must be between ${min} and ${max}`,
  );

export const EVENT_TYPES = [
  "hackathon", "competition", "workshop", "seminar", "conference", "webinar", "festival",
  "debate", "mun", "sports", "cultural", "career_fair", "networking", "other",
] as const;

export const roleDraftSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: text(120).min(2, "Give the role a title"),
    description: text(3000),
    responsibilities: text(3000),
    positions: intString(1, 1000, "Positions").refine((v) => v !== "", "How many people do you need?"),
    skills: text(400),
    eligibility: text(1000),
    experienceLevel: z.enum(["none", "some", "experienced"]),
    timeCommitment: text(300),
    scheduleNotes: text(1000),
    applicationDeadline: localDateTime,
    isPaid: z.boolean(),
    compensationDetails: text(500),
    benefits: text(1000),
    selectionProcess: text(1000),
    requiresEventRegistration: z.boolean(),
  })
  .superRefine((r, ctx) => {
    if (r.isPaid && !r.compensationDetails) {
      ctx.addIssue({ code: "custom", path: ["compensationDetails"], message: "Describe the payment for a paid role" });
    }
  });

export type RoleDraft = z.infer<typeof roleDraftSchema>;

export const eventFormSchema = z
  .object({
    id: z.string().uuid().optional(),
    // 1. Basics
    title: text(140).min(4, "Use at least 4 characters"),
    slug: z.union([z.literal(""), z.string().trim().max(100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens")]),
    eventType: z.enum(EVENT_TYPES),
    categoryId: z.string(),
    summary: text(280),
    description: text(12000),
    coverPath: z.string().max(300).nullable(),
    agenda: z.array(z.object({ time: text(60), title: text(200).min(1, "Add a title"), detail: text(500) })).max(40),
    speakers: z.array(z.object({ name: text(120).min(1, "Add a name"), title: text(200) })).max(30),
    tags: text(300),
    // 2. Logistics
    startsAt: localDateTime,
    endsAt: localDateTime,
    timezone: z.string().max(60),
    format: z.enum(["in_person", "online", "hybrid"]),
    universityId: z.string(),
    campusId: z.string(),
    cityId: z.string(),
    venue: text(200),
    onlineUrl: optionalHttps,
    accessibilityInfo: text(1000),
    contactEmail: z.union([z.literal(""), z.string().trim().email("Enter a valid email").max(200)]),
    contactPhone: z.union([z.literal(""), z.string().trim().regex(/^[+0-9 ()-]{7,30}$/, "Enter a valid phone number")]),
    // 3. Eligibility & registration
    eligibilityScope: z.enum(["open", "host_university", "selected_universities"]),
    targetUniversityIds: z.array(z.string().uuid()).max(100),
    eligibleLevels: z.array(z.enum(["undergraduate", "masters", "phd", "diploma", "other"])),
    eligibilityNotes: text(1000),
    registrationMode: z.enum(["none", "individual", "team", "external"]),
    externalRegistrationUrl: optionalHttps,
    requiresApproval: z.boolean(),
    capacity: intString(1, 100000, "Capacity"),
    waitlistEnabled: z.boolean(),
    teamMin: intString(1, 20, "Minimum team size"),
    teamMax: intString(1, 20, "Maximum team size"),
    registrationOpensAt: localDateTime,
    registrationClosesAt: localDateTime,
    termsText: text(3000),
    formFields: z.custom<FormField[]>((v) => Array.isArray(v)),
    requireUniversityEmail: z.boolean(),
    // 4. Fees
    isFree: z.boolean(),
    feeAmount: z.union([z.literal(""), z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter an amount like 500 or 499.99")]),
    feeDescription: text(1000),
    paymentInstructions: text(2000),
    paymentUrl: optionalHttps,
    refundPolicy: text(2000),
    // 5. Volunteers
    volunteerRecruitmentOpen: z.boolean(),
    roles: z.array(roleDraftSchema).max(30),
    // 7. Publishing
    publishAt: localDateTime,
  })
  .superRefine((e, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    const form = formFieldsSchema.safeParse(e.formFields);
    if (!form.success) issue("formFields", `Registration questions: ${form.error.issues[0]?.message ?? "check each question"}`);
    if (e.startsAt && e.endsAt && e.endsAt <= e.startsAt) issue("endsAt", "The event must end after it starts");
    if (e.registrationOpensAt && e.registrationClosesAt && e.registrationClosesAt <= e.registrationOpensAt) {
      issue("registrationClosesAt", "Registration must close after it opens");
    }
    if (e.registrationClosesAt && e.endsAt && e.registrationClosesAt > e.endsAt) {
      issue("registrationClosesAt", "Registration must close before the event ends");
    }
    if (e.registrationMode === "team") {
      if (!e.teamMin || !e.teamMax) issue("teamMax", "Set the minimum and maximum team size");
      else if (Number(e.teamMax) < Number(e.teamMin)) issue("teamMax", "Maximum must be at least the minimum");
    }
    if (e.registrationMode === "external" && !e.externalRegistrationUrl) issue("externalRegistrationUrl", "Add the registration link");
    if (!e.isFree && !e.feeDescription) issue("feeDescription", "Describe the fee for a paid event");
    if (e.eligibilityScope === "selected_universities" && e.targetUniversityIds.length === 0) {
      issue("targetUniversityIds", "Choose at least one university");
    }
  });

export type EventFormValues = z.infer<typeof eventFormSchema>;

/** Fields validated when leaving each wizard step. */
export const STEP_FIELDS: Record<string, (keyof EventFormValues)[]> = {
  basics: ["title", "slug", "eventType", "categoryId", "summary", "description", "agenda", "speakers", "tags"],
  logistics: ["startsAt", "endsAt", "format", "universityId", "campusId", "cityId", "venue", "onlineUrl", "accessibilityInfo", "contactEmail", "contactPhone"],
  registration: [
    "eligibilityScope", "targetUniversityIds", "eligibleLevels", "eligibilityNotes", "registrationMode", "externalRegistrationUrl",
    "requiresApproval", "requireUniversityEmail", "capacity", "waitlistEnabled", "teamMin", "teamMax", "registrationOpensAt", "registrationClosesAt", "termsText", "formFields",
  ],
  fees: ["isFree", "feeAmount", "feeDescription", "paymentInstructions", "paymentUrl", "refundPolicy"],
  volunteers: ["volunteerRecruitmentOpen", "roles"],
};

/** Requirements for publishing, mirroring private.assert_event_publishable(). */
export function publishProblems(e: EventFormValues): string[] {
  const out: string[] = [];
  if (e.description.trim().length < 50) out.push("Add a description of at least 50 characters.");
  if (!e.categoryId) out.push("Choose a category.");
  if (!e.startsAt || !e.endsAt) out.push("Set the start and end time.");
  if (e.format !== "online" && (!e.venue.trim() || !e.cityId)) out.push("In-person and hybrid events need a venue and city.");
  if (e.registrationMode === "team" && (!e.teamMin || !e.teamMax)) out.push("Set team sizes.");
  if (e.registrationMode === "external" && !e.externalRegistrationUrl) out.push("Add the external registration link.");
  if (!e.isFree && !e.feeDescription.trim()) out.push("Describe the fee.");
  if (e.eligibilityScope === "selected_universities" && !e.targetUniversityIds.length) out.push("Choose eligible universities.");
  return out;
}

export function emptyRole(): RoleDraft {
  return {
    title: "",
    description: "",
    responsibilities: "",
    positions: "1",
    skills: "",
    eligibility: "",
    experienceLevel: "none",
    timeCommitment: "",
    scheduleNotes: "",
    applicationDeadline: "",
    isPaid: false,
    compensationDetails: "",
    benefits: "",
    selectionProcess: "",
    requiresEventRegistration: false,
  };
}
