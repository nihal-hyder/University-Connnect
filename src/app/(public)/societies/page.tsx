import type { Metadata } from "next";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/components/common/pagination";
import { SocietyTile } from "@/components/societies/society-tile";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { getDirectory, listSocieties } from "@/lib/data/events";
import { pluralize } from "@/lib/format";

export const metadata: Metadata = {
  title: "Societies",
  description: "Verified student societies across Pakistan that publish events and recruit volunteers.",
};

const PAGE_SIZE = 30;
const UUID = /^[0-9a-f-]{36}$/i;

export default async function SocietiesPage({ searchParams }: PageProps<"/societies">) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const university = typeof sp.university === "string" && UUID.test(sp.university) ? sp.university : undefined;
  const category = typeof sp.category === "string" && /^[a-z0-9-]{1,60}$/.test(sp.category) ? sp.category : undefined;
  const [directory, { items, total }] = await Promise.all([
    getDirectory(),
    listSocieties({ q: q || undefined, university, category, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  ]);
  const hrefFor = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (university) u.set("university", university);
    if (category) u.set("category", category);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return `/societies${s ? `?${s}` : ""}`;
  };

  return (
    <div className="page-container py-10 md:py-14">
      <header className="grid gap-6 border-b border-border pb-10 md:grid-cols-[1.3fr_1fr] md:items-end">
        <div>
          <p className="eyebrow text-signal-ink">Society directory</p>
          <h1 className="mt-2 font-display text-headline">The societies that make campus happen</h1>
        </div>
        <div className="text-[15px] leading-7 text-muted-foreground">
          <p>
            Every society listed here was reviewed by platform staff before it could publish. Verification confirms the
            society applied with evidence of recognition; it is not an endorsement by any university.
          </p>
          <Link href="/societies/apply" className="mt-3 inline-block font-medium text-primary hover:underline">
            Register your society →
          </Link>
        </div>
      </header>

      <form action="/societies" method="get" role="search" className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
        <div className="space-y-1.5">
          <label htmlFor="soc-q" className="text-sm font-medium">
            Name
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              id="soc-q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Search societies"
              className="h-10 w-full rounded-lg border border-input bg-surface pr-3 pl-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="soc-uni" className="text-sm font-medium">
            University
          </label>
          <NativeSelect id="soc-uni" name="university" defaultValue={university ?? ""} className="sm:w-56">
            <option value="">All universities</option>
            {directory.universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.short_name ?? u.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="soc-cat" className="text-sm font-medium">
            Focus
          </label>
          <NativeSelect id="soc-cat" name="category" defaultValue={category ?? ""} className="sm:w-48">
            <option value="">Any focus</option>
            {directory.categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button type="submit">Search</Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
        {pluralize(total, "verified society", "verified societies")}
      </p>
      {items.length ? (
        <div className="mt-4 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <SocietyTile key={s.id} society={s} />
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-4"
          icon={<Users />}
          title="No societies match"
          description="Try a different name or university. If your society isn't listed yet, you can register it for verification."
          action={
            <Button asChild variant="outline">
              <Link href="/societies/apply">Register a society</Link>
            </Button>
          }
        />
      )}
      <Pagination className="mt-10" page={page} pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))} hrefFor={hrefFor} />
    </div>
  );
}
