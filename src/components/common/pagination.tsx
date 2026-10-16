import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Accessible numbered pagination built from links (works without JS). */
export function Pagination({
  page,
  pageCount,
  hrefFor,
  className,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
  className?: string;
}) {
  if (pageCount <= 1) return null;
  const pages = new Set<number>([1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount));
  const sorted = [...pages].sort((a, b) => a - b);
  const linkClass =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm transition-colors hover:bg-secondary";

  return (
    <nav aria-label="Pagination" className={cn("flex items-center justify-center gap-1", className)}>
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={linkClass} rel="prev" aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span className={cn(linkClass, "pointer-events-none opacity-40")} aria-hidden="true">
          <ChevronLeft className="size-4" />
        </span>
      )}
      {sorted.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && p - sorted[i - 1] > 1 ? <span className="px-1 text-muted-foreground">…</span> : null}
          <Link
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(linkClass, p === page && "bg-foreground text-background hover:bg-foreground")}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className={linkClass} rel="next" aria-label="Next page">
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className={cn(linkClass, "pointer-events-none opacity-40")} aria-hidden="true">
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
