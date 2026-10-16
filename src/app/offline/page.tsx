import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };
export const dynamic = "force-static";

/** Served by the service worker when a page can't load without a connection. */
export default function OfflinePage() {
  return (
    <main id="main" className="flex flex-1 flex-col">
      <div className="page-container flex h-16 items-center">
        <Logo />
      </div>
      <div className="page-container flex max-w-xl flex-1 flex-col justify-center py-20">
        <WifiOff className="size-8 text-muted-foreground" aria-hidden />
        <h1 className="mt-4 font-display text-headline">You&rsquo;re offline</h1>
        <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
          This page needs a connection. Tickets you opened before still work offline: go to{" "}
          <Link href="/dashboard/registrations" prefetch={false} className="font-medium text-primary underline underline-offset-4">
            My registrations
          </Link>{" "}
          and open your ticket.
        </p>
      </div>
    </main>
  );
}
