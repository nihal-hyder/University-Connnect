import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];
export type EventType = Enums["event_type"];
export type EventFormat = Enums["event_format"];
export type EventStatus = Enums["event_status"];
export type ScheduleStatus = Enums["event_schedule_status"];
export type RegistrationMode = Enums["registration_mode"];
export type RegistrationStatus = Enums["registration_status"];
export type EligibilityScope = Enums["eligibility_scope"];
export type AcademicLevel = Enums["academic_level"];
export type VolunteerStatus = Enums["volunteer_application_status"];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  hackathon: "Hackathon",
  competition: "Competition",
  workshop: "Workshop",
  seminar: "Seminar",
  conference: "Conference",
  webinar: "Webinar",
  festival: "Festival",
  debate: "Debate",
  mun: "Model UN",
  sports: "Sports",
  cultural: "Cultural",
  career_fair: "Career fair",
  networking: "Networking",
  other: "Event",
};

export const EVENT_FORMAT_LABELS: Record<EventFormat, string> = {
  in_person: "In person",
  online: "Online",
  hybrid: "Hybrid",
};

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Draft",
  pending_review: "Awaiting review",
  changes_requested: "Changes requested",
  rejected: "Not approved",
  published: "Published",
  archived: "Archived",
};

export const SCHEDULE_STATUS_LABELS: Record<ScheduleStatus, string> = {
  scheduled: "Scheduled",
  postponed: "Postponed",
  cancelled: "Cancelled",
};

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  pending: "Awaiting approval",
  confirmed: "Confirmed",
  waitlisted: "Waitlisted",
  rejected: "Not accepted",
  cancelled: "Cancelled",
};

export const ELIGIBILITY_LABELS: Record<EligibilityScope, string> = {
  open: "Open to all universities",
  host_university: "Host university only",
  selected_universities: "Selected universities",
};

export const ACADEMIC_LEVEL_LABELS: Record<AcademicLevel, string> = {
  undergraduate: "Undergraduate",
  masters: "Master's",
  phd: "PhD",
  diploma: "Diploma / certificate",
  other: "Other",
};

export const VOLUNTEER_STATUS_LABELS: Record<VolunteerStatus, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  shortlisted: "Shortlisted",
  interview_requested: "Interview requested",
  offered: "Offer received",
  accepted: "Accepted",
  declined: "Declined",
  waitlisted: "Waitlisted",
  rejected: "Not selected",
  withdrawn: "Withdrawn",
  completed: "Completed",
};

export type Tone = "neutral" | "positive" | "warning" | "negative" | "info" | "accent";

export const REGISTRATION_STATUS_TONE: Record<RegistrationStatus, Tone> = {
  pending: "warning",
  confirmed: "positive",
  waitlisted: "info",
  rejected: "negative",
  cancelled: "neutral",
};

export const VOLUNTEER_STATUS_TONE: Record<VolunteerStatus, Tone> = {
  submitted: "neutral",
  under_review: "info",
  shortlisted: "info",
  interview_requested: "warning",
  offered: "accent",
  accepted: "positive",
  declined: "neutral",
  waitlisted: "info",
  rejected: "negative",
  withdrawn: "neutral",
  completed: "positive",
};

export const EVENT_STATUS_TONE: Record<EventStatus, Tone> = {
  draft: "neutral",
  pending_review: "warning",
  changes_requested: "warning",
  rejected: "negative",
  published: "positive",
  archived: "neutral",
};
