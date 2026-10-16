import type { VolunteerStatus } from "@/lib/events/labels";

/**
 * Organiser-driven transitions. Mirror of private.volunteer_transition_allowed()
 * (migration 0009), used only to decide which buttons to show. The database
 * enforces the same table on every update.
 *
 * Student-driven moves are separate: offered -> accepted/declined (respond to
 * offer) and most open states -> withdrawn.
 */
export const ORGANISER_TRANSITIONS: Record<VolunteerStatus, readonly VolunteerStatus[]> = {
  submitted: ["under_review", "shortlisted", "interview_requested", "offered", "waitlisted", "rejected"],
  under_review: ["shortlisted", "interview_requested", "offered", "waitlisted", "rejected"],
  shortlisted: ["under_review", "interview_requested", "offered", "waitlisted", "rejected"],
  interview_requested: ["shortlisted", "offered", "waitlisted", "rejected"],
  waitlisted: ["under_review", "shortlisted", "interview_requested", "offered", "rejected"],
  offered: ["waitlisted", "rejected"],
  accepted: ["completed", "rejected"],
  declined: [],
  rejected: [],
  withdrawn: [],
  completed: [],
};

export const WITHDRAWABLE: readonly VolunteerStatus[] = [
  "submitted",
  "under_review",
  "shortlisted",
  "interview_requested",
  "waitlisted",
  "offered",
  "accepted",
];

export function canOrganiserMove(from: VolunteerStatus, to: VolunteerStatus) {
  return ORGANISER_TRANSITIONS[from].includes(to);
}

/** Verb used on organiser buttons. */
export const TRANSITION_VERB: Partial<Record<VolunteerStatus, string>> = {
  under_review: "Mark under review",
  shortlisted: "Shortlist",
  interview_requested: "Request interview",
  offered: "Send offer",
  waitlisted: "Waitlist",
  rejected: "Decline applicant",
  completed: "Mark completed",
};
