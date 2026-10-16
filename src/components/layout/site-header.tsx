import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { parseSiteStatus } from "@/lib/site-status";
import { createClient } from "@/lib/supabase/server";
import { MainNav, MobileNav } from "./main-nav";
import { UserMenu } from "./user-menu";

export const PUBLIC_NAV = [
  { href: "/explore", label: "Explore" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/societies", label: "Societies" },
  { href: "/about", label: "About" },
] as const;

export async function SiteHeader() {
  const supabase = await createClient();
  const [viewer, statusRes] = await Promise.all([getViewer(), supabase.rpc("get_site_status")]);
  const site = parseSiteStatus(statusRes.data);
  let unread = 0;
  if (viewer) {
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null);
    unread = count ?? 0;
  }

  const menuViewer = viewer
    ? {
        name: viewer.profile.full_name || viewer.user.email || "Account",
        email: viewer.user.email,
        isAdmin: viewer.isAdmin,
        societies: viewer.memberships.map((m) => ({ slug: m.society.slug, name: m.society.name })),
        unread,
      }
    : null;

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      {site.scheduledAt ? (
        <p role="status" className="border-b border-warning/40 bg-warning-soft px-4 py-2 text-center text-[13px] leading-5">
          <strong className="font-medium">Scheduled maintenance:</strong> the site will be unavailable from {formatDateTime(site.scheduledAt)} (Pakistan
          time). {site.message ?? "Please plan around it."}
        </p>
      ) : null}
      <div className="page-container flex h-16 items-center gap-3 sm:gap-6">
        <Logo />
        <MainNav items={PUBLIC_NAV} className="hidden lg:flex" />
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          {menuViewer ? (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href={menuViewer.isAdmin ? "/admin" : "/dashboard"}>{menuViewer.isAdmin ? "Admin" : "Dashboard"}</Link>
              </Button>
              <UserMenu viewer={menuViewer} />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
          <MobileNav items={PUBLIC_NAV} signedIn={Boolean(menuViewer)} />
        </div>
      </div>
    </header>
  );
}
