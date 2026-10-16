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

export type SocietyContext = {
  viewer: Viewer;
  role: SocietyRole;
  society: ViewerMembership["society"];
  can: (permission: SocietyPermission) => boolean;
};

/**
 * Resolves the viewer's membership in a society by slug. Non-members get a 404.
 * When a permission is given and the role lacks it, also 404s.
 */
export async function requireSocietyAccess(slug: string, permission?: SocietyPermission): Promise<SocietyContext> {
  const viewer = await requireViewer(`/manage/${slug}`);
  const membership = viewer.memberships.find((m) => m.society.slug === slug);
  if (!membership) notFound();
  const suspended = membership.society.status === "suspended";
  const check = (p: SocietyPermission) =>
    can(membership.role, p) &&
    (!suspended || ["view_society", "view_registrations", "view_volunteer_applicants", "view_analytics", "export_data"].includes(p));
  if (permission && !check(permission)) notFound();
  return { viewer, role: membership.role, society: membership.society, can: check };
}
