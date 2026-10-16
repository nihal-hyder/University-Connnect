import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { Directory } from "@/lib/data/events";
import type { ExploreParams } from "@/lib/events/filters";
import { EVENT_TYPE_LABELS } from "@/lib/events/labels";

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-[13px] font-medium text-foreground/80">
        {label}
      </Label>
      {children}
    </div>
  );
}

const dateInputClass =
  "h-10 w-full min-w-0 rounded-lg border border-input bg-surface px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30";

/**
 * Plain GET form: filters live in the URL so results are shareable and work
 * without JavaScript. `idPrefix` keeps ids unique when rendered twice
 * (desktop sidebar + mobile sheet).
 */
export function FilterForm({
  params,
  directory,
  canFilterMine,
  idPrefix,
  action = "/explore",
}: {
  params: ExploreParams;
  directory: Directory;
  canFilterMine: boolean;
  idPrefix: string;
  action?: string;
}) {
  const id = (k: string) => `${idPrefix}-${k}`;
  const campuses = params.university ? directory.campuses.filter((c) => c.university_id === params.university) : [];

  return (
    <form action={action} method="get" className="space-y-5">
      {params.q ? <input type="hidden" name="q" value={params.q} /> : null}
      {params.sort ? <input type="hidden" name="sort" value={params.sort} /> : null}
      {params.society ? <input type="hidden" name="society" value={params.society} /> : null}

      <Field label="Category" htmlFor={id("category")}>
        <NativeSelect id={id("category")} name="category" defaultValue={params.category ?? ""}>
          <option value="">All categories</option>
          {directory.categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field label="Event type" htmlFor={id("type")}>
        <NativeSelect id={id("type")} name="type" defaultValue={params.type ?? ""}>
          <option value="">All types</option>
          {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field label="University" htmlFor={id("university")}>
        <NativeSelect id={id("university")} name="university" defaultValue={params.university ?? ""}>
          <option value="">Any university</option>
          {directory.universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.short_name ? `${u.short_name} — ${u.name}` : u.name}
            </option>
          ))}
        </NativeSelect>
      </Field>

      {campuses.length > 1 ? (
        <Field label="Campus" htmlFor={id("campus")}>
          <NativeSelect id={id("campus")} name="campus" defaultValue={params.campus ?? ""}>
            <option value="">Any campus</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      ) : null}

      <Field label="City" htmlFor={id("city")}>
        <NativeSelect id={id("city")} name="city" defaultValue={params.city ? String(params.city) : ""}>
          <option value="">Any city</option>
          {directory.cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field label="Format" htmlFor={id("format")}>
        <NativeSelect id={id("format")} name="format" defaultValue={params.format ?? ""}>
          <option value="">In person or online</option>
          <option value="in_person">In person</option>
          <option value="online">Online</option>
          <option value="hybrid">Hybrid</option>
        </NativeSelect>
      </Field>

      <fieldset className="space-y-1.5">
        <legend className="text-[13px] font-medium text-foreground/80">Dates</legend>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor={id("from")} className="sr-only">From</label>
            <input id={id("from")} type="date" name="from" defaultValue={params.from} className={dateInputClass} aria-label="From date" />
          </div>
          <div>
            <label htmlFor={id("to")} className="sr-only">To</label>
            <input id={id("to")} type="date" name="to" defaultValue={params.to} className={dateInputClass} aria-label="To date" />
          </div>
        </div>
      </fieldset>

      <Field label="Fee" htmlFor={id("fee")}>
        <NativeSelect id={id("fee")} name="fee" defaultValue={params.fee ?? ""}>
          <option value="">Free or paid</option>
          <option value="free">Free only</option>
          <option value="paid">Paid only</option>
        </NativeSelect>
      </Field>

      <Field label="Eligibility" htmlFor={id("scope")}>
        <NativeSelect id={id("scope")} name="scope" defaultValue={params.scope ?? ""}>
          <option value="">Any eligibility</option>
          <option value="open">Open to all universities</option>
          <option value="host_university">Host university only</option>
          <option value="selected_universities">Selected universities</option>
        </NativeSelect>
      </Field>

      <div className="space-y-3 pt-1">
        <label className="flex items-center gap-2.5 text-sm">
          <input type="checkbox" name="open" value="1" defaultChecked={params.open === "1"} className="size-4 accent-[var(--primary)]" />
          Registration open now
        </label>
        <label className="flex items-center gap-2.5 text-sm">
          <input type="checkbox" name="volunteering" value="1" defaultChecked={params.volunteering === "1"} className="size-4 accent-[var(--primary)]" />
          Recruiting volunteers
        </label>
        {canFilterMine ? (
          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" name="mine" value="1" defaultChecked={params.mine === "1"} className="size-4 accent-[var(--primary)]" />
            I&rsquo;m eligible (based on my university)
          </label>
        ) : null}
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1">
          Apply filters
        </Button>
        <Button asChild variant="ghost">
          <Link href={params.q ? `${action}?q=${encodeURIComponent(params.q)}` : action}>Clear</Link>
        </Button>
      </div>
    </form>
  );
}
