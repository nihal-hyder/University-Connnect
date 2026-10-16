import type { Metadata } from "next";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import type { SideNavGroup } from "@/components/layout/side-nav";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  const supabase = await createClient();
  const [apps, events, reports] = await Promise.all([
    supabase.from("society_applications").select("id", { count: "exact", head: true }).in("status", ["submitted", "under_review"]),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("reports").select("id", { count: "exact", head: true }).in("status", ["open", "reviewing"]),
  ]);
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
      {children}
    </DashboardShell>
  );
}
