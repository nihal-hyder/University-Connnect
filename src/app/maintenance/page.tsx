import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Wrench } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { siteConfig } from "@/config/site";
import { DEFAULT_MAINTENANCE_MESSAGE, parseSiteStatus } from "@/lib/site-status";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Under maintenance", robots: { index: false, follow: false } };

/**
 * Shown (HTTP 503) to every visitor except platform administrators while
 * maintenance mode is on. The proxy rewrites requests here; visiting the URL
 * directly when the site is online just goes home.
 */
export default async function MaintenancePage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_site_status");
  const status = parseSiteStatus(data);
  if (!error && !status.maintenance) redirect("/");

  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <div className="flex items-center gap-2">
        <LogoMark className="size-8" />
        <span className="font-display text-2xl leading-none tracking-tight">{siteConfig.name}</span>
      </div>
      <div className="mt-12 flex size-16 items-center justify-center rounded-full bg-muted">
        <Wrench className="size-7 text-signal-ink" aria-hidden />
      </div>
      <p className="eyebrow mt-6 text-signal-ink">Under maintenance</p>
      <h1 className="mt-2 max-w-xl font-display text-headline text-balance">The site is under maintenance and will be live again soon</h1>
      <p className="mt-4 max-w-md text-[15px] leading-7 text-pretty text-muted-foreground">{status.message ?? DEFAULT_MAINTENANCE_MESSAGE}</p>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">Your account, registrations and tickets are safe. Thanks for your patience.</p>
      <Link href="/login" prefetch={false} className="mt-16 text-xs text-muted-foreground underline-offset-4 hover:underline">
        Administrator sign in
      </Link>
    </main>
  );
}
