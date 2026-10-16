import type { Metadata } from "next";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/components/common/pagination";
import { EventCard } from "@/components/events/event-card";
import { FilterForm } from "@/components/events/filter-form";
import { MobileFilters } from "@/components/events/mobile-filters";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { getViewer } from "@/lib/auth/session";
import { getDirectory, searchEvents } from "@/lib/data/events";
import { activeFilterCount, buildQuery, parseExploreParams, toEventFilters, type ExploreParams } from "@/lib/events/filters";
import { EVENT_TYPE_LABELS, ELIGIBILITY_LABELS, EVENT_FORMAT_LABELS } from "@/lib/events/labels";
import { pluralize } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Explore events",
  description: "Search and filter university events, hackathons, competitions and workshops across Pakistan.",
};

const PAGE_SIZE = 12;

export default async function ExplorePage({ searchParams }: PageProps<"/explore">) {
  const params = parseExploreParams(await searchParams);
  const page = params.page ?? 1;
  const [viewer, directory] = await Promise.all([getViewer(), getDirectory()]);
  const viewerUniversity = viewer?.profile.university_id ?? null;
  const { items, total } = await searchEvents(toEventFilters(params, viewerUniversity), page, PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filterCount = activeFilterCount(params);

  const societyName = params.society
    ? (await (await createClient()).from("societies").select("name").eq("id", params.society).maybeSingle()).data?.name
    : null;
  const chips = describeFilters(params, directory, societyName);
  const stringParams = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, v === undefined ? undefined : String(v)]));

  return (
    <div className="page-container py-10 md:py-14">
      <header className="max-w-3xl">
        <p className="eyebrow text-signal-ink">Explore</p>
        <h1 className="mt-2 font-display text-headline">
          {params.q ? <>Results for &ldquo;{params.q}&rdquo;</> : params.type ? `${EVENT_TYPE_LABELS[params.type]}s` : "All upcoming events"}
        </h1>
      </header>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form action="/explore" method="get" role="search" className="flex flex-1 items-center gap-2">
          {Object.entries(params).map(([k, v]) =>
            k === "q" || k === "page" || v === undefined ? null : <input key={k} type="hidden" name={k} value={String(v)} />,
          )}
          <label htmlFor="explore-q" className="sr-only">Search events</label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              id="explore-q"
              name="q"
              type="search"
              defaultValue={params.q}
              placeholder="Search by title, society, university or topic"
              className="h-10 w-full rounded-lg border border-input bg-surface pr-3 pl-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>
        <div className="flex items-center gap-2">
          <MobileFilters count={filterCount}>
            <FilterForm params={params} directory={directory} canFilterMine={Boolean(viewerUniversity)} idPrefix="m" />
          </MobileFilters>
          <form action="/explore" method="get" className="flex items-center gap-2">
            {Object.entries(params).map(([k, v]) =>
              k === "sort" || k === "page" || v === undefined ? null : <input key={k} type="hidden" name={k} value={String(v)} />,
            )}
            <label htmlFor="explore-sort" className="sr-only">Sort by</label>
            <NativeSelect id="explore-sort" name="sort" defaultValue={params.sort ?? (params.q ? "relevance" : "soonest")} className="w-44">
              {params.q ? <option value="relevance">Best match</option> : null}
              <option value="soonest">Soonest first</option>
              <option value="deadline">Closing soonest</option>
              <option value="newest">Recently published</option>
            </NativeSelect>
            <Button type="submit" variant="outline">Sort</Button>
          </form>
        </div>
      </div>

      {chips.length ? (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Active filters">
          {chips.map((chip) => (
            <li key={chip.key}>
              <Link
                href={`/explore${buildQuery(stringParams, { [chip.key]: undefined, page: undefined })}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface py-1 pr-2 pl-3 text-sm hover:border-foreground/30"
                aria-label={`Remove filter: ${chip.label}`}
              >
                {chip.label} <X className="size-3.5 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[17rem_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-24 rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-4 font-display text-lg">Filters</h2>
            <FilterForm params={params} directory={directory} canFilterMine={Boolean(viewerUniversity)} idPrefix="d" />
          </div>
        </aside>

        <section aria-live="polite" className="min-w-0">
          <p className="text-sm text-muted-foreground">
            {total ? `${pluralize(total, "event")} found` : null}
            {total && pageCount > 1 ? ` · page ${page} of ${pageCount}` : null}
          </p>
          {items.length ? (
            <>
              <div className="mt-5 grid gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((e, i) => (
                  <EventCard key={e.id} event={e} priority={i < 3} />
                ))}
              </div>
              <Pagination
                className="mt-14"
                page={page}
                pageCount={pageCount}
                hrefFor={(p) => `/explore${buildQuery(stringParams, { page: p })}`}
              />
            </>
          ) : (
            <EmptyState
              className="mt-5"
              title={filterCount || params.q ? "No events match these filters" : "No upcoming events yet"}
              description={
                filterCount || params.q
                  ? "Try removing a filter or searching for a broader term. Past events are not shown."
                  : "When verified societies publish events, they will appear here."
              }
              action={
                filterCount || params.q ? (
                  <Button asChild variant="outline">
                    <Link href="/explore">Clear all filters</Link>
                  </Button>
                ) : null
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}

function describeFilters(p: ExploreParams, d: Awaited<ReturnType<typeof getDirectory>>, societyName?: string | null) {
  const chips: { key: keyof ExploreParams; label: string }[] = [];
  if (p.category) chips.push({ key: "category", label: d.categories.find((c) => c.slug === p.category)?.name ?? p.category });
  if (p.type) chips.push({ key: "type", label: EVENT_TYPE_LABELS[p.type] });
  if (p.university) {
    const u = d.universities.find((x) => x.id === p.university);
    chips.push({ key: "university", label: u?.short_name ?? u?.name ?? "University" });
  }
  if (p.society) chips.push({ key: "society", label: societyName ? `By ${societyName}` : "Selected organiser" });
  if (p.campus) chips.push({ key: "campus", label: d.campuses.find((c) => c.id === p.campus)?.name ?? "Campus" });
  if (p.city) chips.push({ key: "city", label: d.cities.find((c) => c.id === p.city)?.name ?? "City" });
  if (p.format) chips.push({ key: "format", label: EVENT_FORMAT_LABELS[p.format] });
  if (p.from) chips.push({ key: "from", label: `From ${p.from}` });
  if (p.to) chips.push({ key: "to", label: `Until ${p.to}` });
  if (p.fee) chips.push({ key: "fee", label: p.fee === "free" ? "Free" : "Paid" });
  if (p.scope) chips.push({ key: "scope", label: ELIGIBILITY_LABELS[p.scope] });
  if (p.open) chips.push({ key: "open", label: "Registration open" });
  if (p.volunteering) chips.push({ key: "volunteering", label: "Recruiting volunteers" });
  if (p.mine) chips.push({ key: "mine", label: "I'm eligible" });
  return chips;
}
