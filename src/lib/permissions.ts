import type { Database } from "@/lib/supabase/database.types";

export type SocietyRole = Database["public"]["Enums"]["society_role"];

export type SocietyPermission =
  | "view_society"
  | "manage_profile"
  | "manage_members"
  | "manage_admins"
  | "transfer_ownership"
  | "create_events"
  | "edit_events"
  | "publish_events"
  | "cancel_events"
  | "view_registrations"
  | "manage_registrations"
  | "export_data"
  | "check_in"
  | "manage_volunteers"
  | "view_volunteer_applicants"
  | "issue_certificates"
  | "manage_collaborations"
  | "view_analytics";

/**
 * Mirror of private.role_permissions() in the database. Used ONLY to decide
 * what to render; the database is the authority and re-checks every action.
 * A database test keeps this in sync with the SQL definition.
 */
export const ROLE_PERMISSIONS: Record<SocietyRole, readonly SocietyPermission[]> = {
  owner: [
    "view_society", "manage_profile", "manage_members", "manage_admins", "transfer_ownership",
    "create_events", "edit_events", "publish_events", "cancel_events",
    "view_registrations", "manage_registrations", "export_data", "check_in",
    "manage_volunteers", "view_volunteer_applicants", "issue_certificates",
    "manage_collaborations", "view_analytics",
  ],
  admin: [
    "view_society", "manage_profile", "manage_members",
    "create_events", "edit_events", "publish_events", "cancel_events",
    "view_registrations", "manage_registrations", "export_data", "check_in",
    "manage_volunteers", "view_volunteer_applicants", "issue_certificates",
    "manage_collaborations", "view_analytics",
  ],
  event_manager: [
    "view_society", "create_events", "edit_events", "publish_events", "cancel_events",
    "view_registrations", "manage_registrations", "export_data", "check_in",
    "manage_collaborations", "view_analytics",
  ],
  volunteer_coordinator: ["view_society", "manage_volunteers", "view_volunteer_applicants", "issue_certificates", "check_in"],
  analyst: ["view_society", "view_analytics"],
};

export const ROLE_LABELS: Record<SocietyRole, string> = {
  owner: "Owner",
  admin: "Administrator",
  event_manager: "Event manager",
  volunteer_coordinator: "Volunteer coordinator",
  analyst: "Analyst (read-only)",
};

export const ROLE_DESCRIPTIONS: Record<SocietyRole, string> = {
  owner: "Full control, including ownership transfer and managing administrators.",
  admin: "Manages the profile, members (except administrators), events, registrations and volunteers.",
  event_manager: "Creates, publishes and runs events, including registrations and check-in.",
  volunteer_coordinator: "Runs volunteer recruitment, shifts, certificates and check-in. Cannot see registrations.",
  analyst: "Views aggregate analytics only. No access to personal data.",
};

export function can(role: SocietyRole | null | undefined, permission: SocietyPermission): boolean {
  return role ? ROLE_PERMISSIONS[role].includes(permission) : false;
}
