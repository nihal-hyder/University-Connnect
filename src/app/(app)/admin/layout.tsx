import type { Metadata } from "next";
import Link from "next/link";
import { parseSiteStatus } from "@/lib/site-status";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import type { SideNavGroup } from "@/components/layout/side-nav";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  const supabase = await createClient();
  const [apps, events, reports, siteStatus] = await Promise.all([
    supabase.from("society_applications").select("id", { count: "exact", head: true }).in("status", ["submitted", "under_review"]),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("reports").select("id", { count: "exact", head: true }).in("status", ["open", "reviewing"]),
    supabase.rpc("get_site_status"),
  ]);
  const maintenance = parseSiteStatus(siteStatus.data).maintenance;
  const nav: SideNavGroup[] = [
    { items: [{ href: "/admin", label: "Overview", icon: "shield", exact: true }] },
    {
      label: "Queues",
      items: [
        { href: "/admin/societies", label: "Society applications", icon: "check", badge: apps.count ?? 0 },
        { href: "/admin/events", label: "Event reviews", icon: "calendar", badge: events.count ?? 0 },
        { href: "/admin/reports", label: "Reports", icon: "flag", badge: reports.count ?? 0 },
      ],
    },
    {
      label: "Platform",
      items: [
        { href: "/admin/active-societies", label: "Societies", icon: "building" },
        { href: "/admin/directory", label: "Directory", icon: "library" },
        { href: "/admin/audit", label: "Audit log", icon: "log" },
      ],
    },
  ];
  return (
    <DashboardShell nav={nav} navLabel="Administration" header={<p className="eyebrow px-3 text-signal-ink">Platform admin</p>}>
      {maintenance ? (
        <p role="status" className="mb-6 rounded-lg border border-warning/50 bg-warning-soft px-4 py-2.5 text-sm">
          <strong className="font-medium">Maintenance mode is on.</strong> Only administrators can use the site.{" "}
          <Link href="/admin" className="font-medium text-primary underline-offset-4 hover:underline">
            Manage
          </Link>
        </p>
      ) : null}
      {children}
    </DashboardShell>
  );
}
