import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { siteConfig } from "@/config/site";

const COLUMNS = [
  {
    title: "Discover",
    links: [
      { href: "/explore", label: "All events" },
      { href: "/explore?type=hackathon", label: "Hackathons" },
      { href: "/explore?type=competition", label: "Competitions" },
      { href: "/explore?type=workshop", label: "Workshops" },
      { href: "/opportunities", label: "Volunteering" },
    ],
  },
  {
    title: "For societies",
    links: [
      { href: "/societies", label: "Society directory" },
      { href: "/societies/apply", label: "Register your society" },
      { href: "/about#organisers", label: "How organising works" },
      { href: "/verify", label: "Verify a certificate" },
    ],
  },
  {
    title: "Platform",
    links: [
      { href: "/about", label: "About" },
      { href: "/guidelines", label: "Community guidelines" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="page-container grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{siteConfig.description}</p>
          <p className="mt-4 text-sm">
            <a className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground" href={`mailto:${siteConfig.contactEmail}`}>
              {siteConfig.contactEmail}
            </a>
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="eyebrow">{col.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-foreground/80 hover:text-foreground hover:underline hover:underline-offset-4">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="page-container flex flex-col gap-2 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.fullName}. Free for students and societies.
          </p>
          <p>
            Report a problem:{" "}
            <a href={`mailto:${siteConfig.safetyEmail}`} className="underline underline-offset-4">
              {siteConfig.safetyEmail}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
