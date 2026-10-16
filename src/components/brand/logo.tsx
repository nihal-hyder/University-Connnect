import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/** Wordmark. The mark is a simple jaali diamond so it survives renaming. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6", className)} aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="5" className="fill-primary" />
      <path d="M12 5 L19 12 L12 19 L5 12 Z" fill="none" stroke="var(--paper)" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.2" className="fill-signal" />
    </svg>
  );
}

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2", className)} aria-label={`${siteConfig.name} home`}>
      <LogoMark />
      <span className="font-display text-[1.35rem] leading-none tracking-tight text-foreground">
        {siteConfig.name}
      </span>
    </Link>
  );
}
