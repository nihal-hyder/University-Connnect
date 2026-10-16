import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, type SocietyPermission, type SocietyRole } from "@/lib/permissions";

/**
 * Data Access Layer for authentication. All authorisation decisions in pages
 * and server actions start here. Results are memoised per request.
 */

export type SessionUser = { id: string; email: string | null };

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  // getClaims() verifies the JWT; never trust getSession() on the server.
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return { id: data.claims.sub, email: (data.claims.email as string | undefined) ?? null };
});

export type ViewerMembership = {
  society_id: string;
  role: SocietyRole;
  /** True when a platform admin is acting without being a member. */
  viaAdmin?: boolean;
  society: { id: string; slug: string; name: string; logo_path: string | null; status: "active" | "suspended" };
};

export type Viewer = {
  user: SessionUser;
  profile: {
    id: string;
    full_name: string;
    avatar_path: string | null;
    university_id: string | null;
    campus_id: string | null;
    academic_level: string | null;
    onboarded_at: string | null;
  };
  isAdmin: boolean;
  memberships: ViewerMembership[];
};

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();

  const [profileRes, adminRes, membershipRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, avatar_path, university_id, campus_id, academic_level, onboarded_at")
      .eq("id", user.id)
      .single(),
    supabase.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("society_memberships")
      .select("society_id, role, society:societies!inner(id, slug, name, logo_path, status)")
      .eq("user_id", user.id)
      .order("created_at"),
  ]);

  if (!profileRes.data) return null;

  return {
    user,
    profile: profileRes.data,
    isAdmin: Boolean(adminRes.data),
    memberships: (membershipRes.data ?? []) as ViewerMembership[],
  };
});

/** Redirects to login (preserving the destination) when signed out. */
export async function requireViewer(nextPath = "/dashboard"): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return viewer;
}

/** Platform administrators only. Others receive a 404 (no information leak). */
export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer("/admin");
  if (!viewer.isAdmin) notFound();
  return viewer;
}

/** A virtual owner-level membership for platform admins (no row in the table). */
const adminMembership = cache(async (slug: string): Promise<ViewerMembership | undefined> => {
  const supabase = await createClient();
  const { data } = await supabase.from("societies").select("id, slug, name, logo_path, status").eq("slug", slug).maybeSingle();
  if (!data) return undefined;
  return { society_id: data.id, role: "owner", society: data, viaAdmin: true };
});

export type SocietyContext = {
  viewer: Viewer;
  role: SocietyRole;
  society: ViewerMembership["society"];
  can: (permission: SocietyPermission) => boolean;
  viaAdmin: boolean;
};

/**
 * Resolves the viewer's membership in a society by slug. Non-members get a 404.
 * When a permission is given and the role lacks it, also 404s.
 */
export async function requireSocietyAccess(slug: string, permission?: SocietyPermission): Promise<SocietyContext> {
  const viewer = await requireViewer(`/manage/${slug}`);
  let membership = viewer.memberships.find((m) => m.society.slug === slug);
  // Platform administrators can open any society's workspace with full
  // (owner-level) permissions; the database grants them the same.
  if (!membership && viewer.isAdmin) membership = await adminMembership(slug);
  if (!membership) notFound();
  const m = membership;
  const suspended = m.society.status === "suspended";
  const check = (p: SocietyPermission) =>
    Boolean(m.viaAdmin) ||
    (can(m.role, p) &&
    (!suspended || ["view_society", "view_registrations", "view_volunteer_applicants", "view_analytics", "export_data"].includes(p)));
  if (permission && !check(permission)) notFound();
  return { viewer, role: m.role, society: m.society, can: check, viaAdmin: Boolean(m.viaAdmin) };
}
