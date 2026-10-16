import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="page-container py-10 md:py-14" role="status" aria-label="Loading events">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-10 w-80 max-w-full" />
      <Skeleton className="mt-8 h-10 w-full" />
      <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i}>
            <Skeleton className="aspect-[16/10] w-full rounded-lg" />
            <Skeleton className="mt-4 h-3 w-40" />
            <Skeleton className="mt-2 h-5 w-3/4" />
            <Skeleton className="mt-2 h-3 w-1/2" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
