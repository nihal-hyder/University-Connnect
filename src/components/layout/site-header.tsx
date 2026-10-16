import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/session";
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
  const viewer = await getViewer();
  let unread = 0;
  if (viewer) {
    const supabase = await createClient();
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
      <div className="page-container flex h-16 items-center gap-6">
        <Logo />
        <MainNav items={PUBLIC_NAV} className="hidden md:flex" />
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {menuViewer ? (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href="/dashboard">Dashboard</Link>
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
