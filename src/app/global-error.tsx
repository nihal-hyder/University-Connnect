"use client";

import { useEffect } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { themeScript } from "@/components/theme/theme-script";
import { siteConfig } from "@/config/site";
import "./globals.css";

/**
 * Last-resort error page for failures in the root layout itself. It replaces
 * the whole document, so it brings its own <html>, styles and theme.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <head>
        <title>{`Something went wrong · ${siteConfig.name}`}</title>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <main id="main" className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
          <div className="flex items-center gap-2">
            <LogoMark className="size-8" />
            <span className="font-display text-2xl leading-none tracking-tight">{siteConfig.name}</span>
          </div>
          <p className="eyebrow mt-12 text-signal-ink">Something went wrong</p>
          <h1 className="mt-2 max-w-xl font-display text-headline text-balance">We hit an unexpected problem</h1>
          <p className="mt-4 max-w-md text-[15px] leading-7 text-pretty text-muted-foreground">
            It&rsquo;s probably temporary. Try again in a moment
            {error.digest ? (
              <>
                , and if it keeps happening quote reference <span className="font-mono text-foreground">{error.digest}</span>
              </>
            ) : null}
            .
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={retry}
              className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Try again
            </button>
            <Link href="/" className="inline-flex h-10 items-center rounded-md border border-border px-5 text-sm font-medium hover:bg-muted">
              Home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
