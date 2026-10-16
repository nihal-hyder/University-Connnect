import { DashboardShell } from "@/components/layout/dashboard-shell";
import type { SideNavGroup } from "@/components/layout/side-nav";
import { requireViewer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const viewer = await requireViewer("/dashboard");
  const supabase = await createClient();
  const [{ count: unread }, { count: offers }] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    supabase.from("volunteer_applications").select("id", { count: "exact", head: true }).eq("user_id", viewer.user.id).eq("status", "offered"),
  ]);

  const nav: SideNavGroup[] = [
    {
      items: [
        { href: "/dashboard", label: "Overview", icon: "overview", exact: true },
        { href: "/explore", label: "Discover events", icon: "compass" },
        { href: "/opportunities", label: "Volunteering", icon: "volunteer" },
      ],
    },
    {
      label: "Yours",
      items: [
        { href: "/dashboard/registrations", label: "My registrations", icon: "ticket" },
        { href: "/dashboard/applications", label: "My applications", icon: "applications", badge: offers ?? 0 },
        { href: "/dashboard/saved", label: "Saved", icon: "saved" },
        { href: "/dashboard/certificates", label: "Certificates", icon: "check" },
        { href: "/dashboard/notifications", label: "Notifications", icon: "bell", badge: unread ?? 0 },
        { href: "/dashboard/settings", label: "Profile & settings", icon: "settings" },
      ],
    },
  ];
  nav.push({
    label: "Societies",
    items: [
      { href: "/dashboard/societies", label: "My societies", icon: "building" },
      ...viewer.memberships.map((m) => ({ href: `/manage/${m.society.slug}`, label: m.society.name, icon: "users" as const })),
    ],
  });
  if (viewer.isAdmin) nav.push({ label: "Platform", items: [{ href: "/admin", label: "Administration", icon: "shield" }] });

  return (
    <DashboardShell nav={nav} navLabel="Dashboard">
      {children}
    </DashboardShell>
  );
}
