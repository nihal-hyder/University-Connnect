import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="flex flex-1 flex-col">
      <div className="page-container flex h-16 items-center">
        <Logo />
      </div>
      <div className="page-container flex max-w-xl flex-1 flex-col justify-center py-20">
        <p className="eyebrow text-signal-ink">404</p>
        <h1 className="mt-2 font-display text-headline">We couldn&rsquo;t find that page</h1>
        <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
          It may have been moved, unpublished, or you may not have access to it. If you followed a link from an organiser, ask them
          to check it.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/explore">Explore events</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
