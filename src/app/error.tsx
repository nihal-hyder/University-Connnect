"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Route-level error boundary. Never shows internal error details to users. */
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <main id="main" className="page-container flex max-w-xl flex-1 flex-col justify-center py-20">
      <p className="eyebrow text-signal-ink">Something went wrong</p>
      <h1 className="mt-2 font-display text-headline">This page didn&rsquo;t load</h1>
      <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
        It&rsquo;s probably temporary. Try again, and if it keeps happening, let us know
        {error.digest ? (
          <>
            {" "}
            and quote reference <span className="font-mono text-foreground">{error.digest}</span>
          </>
        ) : null}
        .
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={retry}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </main>
  );
}
