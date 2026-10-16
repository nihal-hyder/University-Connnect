import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder shaped like a workspace page: header, stats, list. */
export function WorkspaceSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="animate-in fade-in duration-300">
      <div className="mb-8 border-b border-border pb-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-8 w-72 max-w-full" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-6 rounded-xl border border-border bg-surface p-5 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-12" />
          </div>
        ))}
      </div>
      <div className="mt-10 space-y-4">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="size-12 rounded-md" />
            <div className="flex-1">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
