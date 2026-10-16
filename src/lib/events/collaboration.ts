/** What a host society can grant a collaborating society. Mirrors event_collaborations.can_* columns. */
export type CollabPerms = {
  canEditDetails: boolean;
  canManageVolunteers: boolean;
  canViewRegistrations: boolean;
  canCheckIn: boolean;
  canViewAnalytics: boolean;
};

export const PERMISSION_COPY: { key: keyof CollabPerms; label: string; body: string }[] = [
  { key: "canEditDetails", label: "Edit event details", body: "Description, agenda, logistics. Not publishing or cancelling." },
  { key: "canManageVolunteers", label: "Run assigned volunteer roles", body: "Review applicants and manage shifts for roles you assign to them." },
  { key: "canViewRegistrations", label: "View registrations", body: "Names, emails and answers of registrants. Includes export." },
  { key: "canCheckIn", label: "Check people in", body: "Scan tickets on the day." },
  { key: "canViewAnalytics", label: "See analytics", body: "Aggregate numbers only." },
];

export function permsFromRow(r: {
  can_edit_details: boolean;
  can_manage_volunteers: boolean;
  can_view_registrations: boolean;
  can_check_in: boolean;
  can_view_analytics: boolean;
}): CollabPerms {
  return {
    canEditDetails: r.can_edit_details,
    canManageVolunteers: r.can_manage_volunteers,
    canViewRegistrations: r.can_view_registrations,
    canCheckIn: r.can_check_in,
    canViewAnalytics: r.can_view_analytics,
  };
}
