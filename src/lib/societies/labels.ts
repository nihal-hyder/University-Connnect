import type { Tone } from "@/lib/events/labels";
import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];
export type SocietyApplicationStatus = Enums["society_application_status"];

export const APPLICATION_STATUS_COPY: Record<SocietyApplicationStatus, { label: string; tone: Tone; help: string }> = {
  draft: { label: "Draft", tone: "neutral", help: "Not yet sent. Only you can see it." },
  submitted: { label: "Submitted", tone: "info", help: "Waiting for a reviewer to pick it up." },
  under_review: { label: "Under review", tone: "info", help: "A reviewer is checking the details." },
  info_requested: { label: "More information requested", tone: "warning", help: "Update the application and resubmit." },
  approved: { label: "Approved", tone: "positive", help: "The society is verified." },
  rejected: { label: "Not approved", tone: "negative", help: "See the reviewer's note." },
};

export const COLLABORATION_STATUS_COPY: Record<Enums["collaboration_status"], { label: string; tone: Tone }> = {
  pending: { label: "Pending", tone: "warning" },
  accepted: { label: "Accepted", tone: "positive" },
  declined: { label: "Declined", tone: "neutral" },
  revoked: { label: "Revoked", tone: "neutral" },
};

export const REPORT_REASON_LABELS: Record<Enums["report_reason"], string> = {
  fraudulent_event: "Fraudulent event",
  impersonation: "Impersonation",
  misleading_fees: "Misleading fees",
  spam: "Spam",
  inappropriate_content: "Inappropriate content",
  misuse_of_data: "Misuse of participant information",
  other: "Other",
};

export const REPORT_STATUS_COPY: Record<Enums["report_status"], { label: string; tone: Tone }> = {
  open: { label: "Open", tone: "warning" },
  reviewing: { label: "Reviewing", tone: "info" },
  resolved: { label: "Resolved", tone: "positive" },
  dismissed: { label: "Dismissed", tone: "neutral" },
};
