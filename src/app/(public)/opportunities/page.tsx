import type { Metadata } from "next";
import Link from "next/link";
import { HeartHandshake } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/components/common/pagination";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { OpportunityList } from "@/components/volunteers/opportunity-list";
import { getDirectory, listOpportunities } from "@/lib/data/events";
import { pluralize } from "@/lib/format";

export const metadata: Metadata = {
  title: "Volunteer opportunities",
  description: "Join the teams that run university events across Pakistan: registration desks, logistics, media, tech support and more.",
};

const PAGE_SIZE = 15;

export default async function OpportunitiesPage({ searchParams }: PageProps<"/opportunities">) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const city = Number(sp.city) > 0 ? Number(sp.city) : undefined;
  const category = typeof sp.category === "string" && /^[a-z0-9-]{1,60}$/.test(sp.category) ? sp.category : undefined;
  const [directory, { items, total }] = await Promise.all([
    getDirectory(),
    listOpportunities({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, city, category }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (city) u.set("city", String(city));
    if (category) u.set("category", category);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return `/opportunities${s ? `?${s}` : ""}`;
  };

  return (
    <div className="page-container py-10 md:py-14">
      <header className="grid gap-6 border-b border-border pb-10 md:grid-cols-[1.3fr_1fr] md:items-end">
        <div>
          <p className="eyebrow text-signal-ink">Volunteering</p>
          <h1 className="mt-2 font-display text-headline">Join the team behind the event</h1>
        </div>
        <p className="text-[15px] leading-7 text-muted-foreground">
          Societies recruit students to run registration desks, logistics, media and technical support. Every listing states the
          time commitment, whether it is paid, and how people are selected.
        </p>
      </header>

      <form action="/opportunities" method="get" className="mt-8 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor="opp-city" className="text-sm font-medium">
            City
          </label>
          <NativeSelect id="opp-city" name="city" defaultValue={city ? String(city) : ""} className="w-44">
            <option value="">All cities</option>
            {directory.cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="opp-category" className="text-sm font-medium">
            Event category
          </label>
          <NativeSelect id="opp-category" name="category" defaultValue={category ?? ""} className="w-52">
            <option value="">All categories</option>
            {directory.categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button type="submit" variant="outline">
          Apply filters
        </Button>
        {city || category ? (
          <Button asChild variant="ghost">
            <Link href="/opportunities">Clear</Link>
          </Button>
        ) : null}
        <p className="ml-auto text-sm text-muted-foreground" aria-live="polite">
          {pluralize(total, "open role")}
        </p>
      </form>

      <div className="mt-6">
        {items.length ? (
          <OpportunityList items={items} />
        ) : (
          <EmptyState
            icon={<HeartHandshake />}
            title={city || category ? "No open roles match these filters" : "No volunteer roles are open right now"}
            description="Societies add roles as their events take shape. Check back soon, or save events you like to hear when they recruit."
            action={
              <Button asChild variant="outline">
                <Link href="/explore">Explore events</Link>
              </Button>
            }
          />
        )}
      </div>
      <Pagination className="mt-10" page={page} pageCount={pageCount} hrefFor={qs} />
    </div>
  );
}
