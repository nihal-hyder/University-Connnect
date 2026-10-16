import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import type { SideNavGroup } from "@/components/layout/side-nav";
import { SocietyAvatar } from "@/components/societies/society-tile";
import { requireSocietyAccess } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export default async function ManageLayout({ children, params }: LayoutProps<"/manage/[slug]">) {
  const { slug } = await params;
  const ctx = await requireSocietyAccess(slug);
  const base = `/manage/${slug}`;
  const supabase = await createClient();
  const { count: pendingCollabs } = ctx.can("manage_collaborations")
    ? await supabase.from("event_collaborations").select("id", { count: "exact", head: true }).eq("society_id", ctx.society.id).eq("status", "pending")
    : { count: 0 };

  const nav: SideNavGroup[] = [
    {
      items: [
        { href: base, label: "Overview", icon: "overview", exact: true },
        { href: `${base}/events`, label: "Events", icon: "calendar" },
        ...(ctx.can("create_events") && ctx.society.status === "active" ? [{ href: `${base}/events/new`, label: "Create event", icon: "create" as const, exact: true }] : []),
        ...(ctx.can("manage_volunteers") || ctx.can("view_volunteer_applicants") ? [{ href: `${base}/volunteers`, label: "Volunteers", icon: "volunteer" as const }] : []),
        ...(ctx.can("manage_collaborations") || ctx.can("view_society")
          ? [{ href: `${base}/collaborations`, label: "Collaborations", icon: "handshake" as const, badge: pendingCollabs ?? 0 }]
          : []),
        ...(ctx.can("view_analytics") ? [{ href: `${base}/analytics`, label: "Analytics", icon: "chart" as const }] : []),
      ],
    },
    {
      label: "Society",
      items: [
        { href: `${base}/members`, label: "Members & roles", icon: "users" },
        ...(ctx.can("manage_profile") ? [{ href: `${base}/profile`, label: "Public profile", icon: "building" as const }] : []),
      ],
    },
  ];

  return (
    <DashboardShell
      nav={nav}
      navLabel={`${ctx.society.name} workspace`}
      header={
        <div className="flex items-center gap-3 lg:px-3">
          <SocietyAvatar name={ctx.society.name} logoPath={ctx.society.logo_path} size={40} />
          <div className="min-w-0">
            <Link href={`/societies/${ctx.society.slug}`} className="block truncate text-sm font-medium hover:underline">
              {ctx.society.name}
            </Link>
            <p className="truncate text-xs text-muted-foreground">{ROLE_LABELS[ctx.role]}</p>
          </div>
        </div>
      }
    >
      {ctx.society.status === "suspended" ? (
        <div role="alert" className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          This society is suspended by platform staff. Its events are hidden and changes are disabled. You can still view and
          export existing records. Contact support if you think this is a mistake.
        </div>
      ) : null}
      {children}
    </DashboardShell>
  );
}
