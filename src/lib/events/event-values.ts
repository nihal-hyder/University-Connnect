import type { ManagedEvent } from "@/lib/data/manage";
import type { FormField } from "@/lib/forms/schema";
import { isoToLocalInput } from "@/lib/format";
import type { EventFormValues, RoleDraft } from "./event-schema";

type RoleRow = {
  id: string;
  title: string;
  description: string | null;
  responsibilities: string | null;
  positions: number;
  skills: string[];
  eligibility: string | null;
  experience_level: RoleDraft["experienceLevel"];
  time_commitment: string | null;
  schedule_notes: string | null;
  application_deadline: string | null;
  is_paid: boolean;
  compensation_details: string | null;
  benefits: string | null;
  selection_process: string | null;
  requires_event_registration: boolean;
};

type Agenda = { time?: string; title?: string; detail?: string };
type Speaker = { name?: string; title?: string };

export function blankEventValues(defaultUniversityId: string): EventFormValues {
  return {
    title: "",
    slug: "",
    eventType: "workshop",
    categoryId: "",
    summary: "",
    description: "",
    coverPath: null,
    agenda: [],
    speakers: [],
    tags: "",
    startsAt: "",
    endsAt: "",
    timezone: "Asia/Karachi",
    format: "in_person",
    universityId: defaultUniversityId,
    campusId: "",
    cityId: "",
    venue: "",
    onlineUrl: "",
    accessibilityInfo: "",
    contactEmail: "",
    contactPhone: "",
    eligibilityScope: "open",
    targetUniversityIds: [],
    eligibleLevels: [],
    eligibilityNotes: "",
    registrationMode: "individual",
    externalRegistrationUrl: "",
    requiresApproval: true,
    capacity: "",
    waitlistEnabled: true,
    teamMin: "",
    teamMax: "",
    registrationOpensAt: "",
    registrationClosesAt: "",
    termsText: "",
    formFields: [],
    requireUniversityEmail: false,
    isFree: true,
    feeAmount: "",
    feeDescription: "",
    paymentInstructions: "",
    paymentUrl: "",
    refundPolicy: "",
    volunteerRecruitmentOpen: false,
    roles: [],
    publishAt: "",
  };
}

/** Database row -> wizard values. online_url is private and loaded separately. */
export function eventToFormValues(
  e: ManagedEvent,
  extra: { targets: string[]; formFields: FormField[]; roles: RoleRow[]; onlineUrl: string | null },
): EventFormValues {
  const tz = e.timezone || "Asia/Karachi";
  const local = (v: string | null) => isoToLocalInput(v, tz);
  const s = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v));
  return {
    id: e.id,
    title: e.title,
    slug: e.slug,
    eventType: e.event_type,
    categoryId: s(e.category_id),
    summary: s(e.summary),
    description: s(e.description),
    coverPath: e.cover_path,
    agenda: (Array.isArray(e.agenda) ? (e.agenda as Agenda[]) : []).map((a) => ({ time: a.time ?? "", title: a.title ?? "", detail: a.detail ?? "" })),
    speakers: (Array.isArray(e.speakers) ? (e.speakers as Speaker[]) : []).map((p) => ({ name: p.name ?? "", title: p.title ?? "" })),
    tags: e.tags.join(", "),
    startsAt: local(e.starts_at),
    endsAt: local(e.ends_at),
    timezone: tz,
    format: e.format,
    universityId: s(e.university_id),
    campusId: s(e.campus_id),
    cityId: s(e.city_id),
    venue: s(e.venue),
    onlineUrl: s(extra.onlineUrl),
    accessibilityInfo: s(e.accessibility_info),
    contactEmail: s(e.contact_email),
    contactPhone: s(e.contact_phone),
    eligibilityScope: e.eligibility_scope,
    targetUniversityIds: extra.targets,
    eligibleLevels: e.eligible_levels,
    eligibilityNotes: s(e.eligibility_notes),
    registrationMode: e.registration_mode,
    externalRegistrationUrl: s(e.external_registration_url),
    requiresApproval: e.requires_approval,
    capacity: s(e.capacity),
    waitlistEnabled: e.waitlist_enabled,
    teamMin: s(e.team_min),
    teamMax: s(e.team_max),
    registrationOpensAt: local(e.registration_opens_at),
    registrationClosesAt: local(e.registration_closes_at),
    termsText: s(e.terms_text),
    formFields: extra.formFields,
    requireUniversityEmail: e.require_university_email,
    isFree: e.is_free,
    feeAmount: s(e.fee_amount),
    feeDescription: s(e.fee_description),
    paymentInstructions: s(e.payment_instructions),
    paymentUrl: s(e.payment_url),
    refundPolicy: s(e.refund_policy),
    volunteerRecruitmentOpen: e.volunteer_recruitment_open,
    roles: extra.roles.map((r) => ({
      id: r.id,
      title: r.title,
      description: s(r.description),
      responsibilities: s(r.responsibilities),
      positions: String(r.positions),
      skills: r.skills.join(", "),
      eligibility: s(r.eligibility),
      experienceLevel: r.experience_level,
      timeCommitment: s(r.time_commitment),
      scheduleNotes: s(r.schedule_notes),
      applicationDeadline: isoToLocalInput(r.application_deadline),
      isPaid: r.is_paid,
      compensationDetails: s(r.compensation_details),
      benefits: s(r.benefits),
      selectionProcess: s(r.selection_process),
      requiresEventRegistration: r.requires_event_registration,
    })),
    publishAt: local(e.publish_at),
  };
}
