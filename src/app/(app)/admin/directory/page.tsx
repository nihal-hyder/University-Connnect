import type { Metadata } from "next";
import { DirectoryForm } from "@/components/admin/directory-form";
import { DomainEditor } from "@/components/admin/domain-editor";
import { ActionButton } from "@/components/common/action-button";
import { PageHeader, Section } from "@/components/layout/dashboard-shell";
import { setDirectoryActive } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Directory" };

function Toggle({ kind, id, active }: { kind: "university" | "campus" | "department" | "category"; id: string; active: boolean }) {
  return (
    <ActionButton size="xs" variant="ghost" action={setDirectoryActive.bind(null, kind, id, !active)}>
      {active ? "Hide" : "Show"}
    </ActionButton>
  );
}

export default async function DirectoryPage() {
  await requireAdmin();
  const supabase = await createClient();
  // Admins see inactive rows too (RLS: is_active or is_platform_admin()).
  const [unis, campuses, depts, cats, cities] = await Promise.all([
    supabase.from("universities").select("id, name, short_name, is_active, email_domains").order("name"),
    supabase.from("campuses").select("id, name, university_id, is_active").order("name"),
    supabase.from("departments").select("id, name, university_id, is_active").order("name"),
    supabase.from("event_categories").select("id, name, is_active").order("sort_order"),
    supabase.from("cities").select("id, name").eq("is_active", true).order("name"),
  ]);

  return (
    <>
      <PageHeader title="Directory" description="Controlled lists of universities, campuses, departments and categories. Hiding keeps existing records intact." />
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-10">
          <Section title={`Universities (${unis.data?.length ?? 0})`}>
            <ul className="divide-y divide-border rounded-xl border border-border bg-surface text-sm">
              {(unis.data ?? []).map((u) => {
                const c = (campuses.data ?? []).filter((x) => x.university_id === u.id);
                const d = (depts.data ?? []).filter((x) => x.university_id === u.id);
                return (
                  <li key={u.id} className={cn("flex items-start gap-3 px-4 py-3", !u.is_active && "opacity-60")}>
                    <details className="min-w-0 flex-1">
                      <summary className="cursor-pointer">
                        <span>
                          <span className="font-medium">{u.name}</span>
                          {u.short_name ? <span className="text-muted-foreground"> · {u.short_name}</span> : null}
                          <span className="text-muted-foreground">
                            {" "}
                            · {c.length} campuses · {d.length} departments
                          </span>
                        </span>
                      </summary>
                      <DomainEditor universityId={u.id} name={u.name} initial={u.email_domains} />
                      <div className="mt-3 grid gap-4 sm:grid-cols-2">
                        <ul className="space-y-1">
                          <li className="eyebrow">Campuses</li>
                          {c.map((x) => (
                            <li key={x.id} className={cn("flex items-center justify-between", !x.is_active && "opacity-60")}>
                              {x.name} <Toggle kind="campus" id={x.id} active={x.is_active} />
                            </li>
                          ))}
                        </ul>
                        <ul className="space-y-1">
                          <li className="eyebrow">Departments</li>
                          {d.map((x) => (
                            <li key={x.id} className={cn("flex items-center justify-between", !x.is_active && "opacity-60")}>
                              {x.name} <Toggle kind="department" id={x.id} active={x.is_active} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    </details>
                    <Toggle kind="university" id={u.id} active={u.is_active} />
                  </li>
                );
              })}
            </ul>
          </Section>
          <Section title="Event categories">
            <ul className="flex flex-wrap gap-2">
              {(cats.data ?? []).map((c) => (
                <li key={c.id} className={cn("inline-flex items-center gap-1 rounded-full border border-border bg-surface py-0.5 pr-1 pl-3 text-sm", !c.is_active && "opacity-60")}>
                  {c.name}
                  <Toggle kind="category" id={String(c.id)} active={c.is_active} />
                </li>
              ))}
            </ul>
          </Section>
        </div>
        <aside className="min-w-0">
          <DirectoryForm universities={(unis.data ?? []).filter((u) => u.is_active).map((u) => ({ id: u.id, name: u.name }))} cities={cities.data ?? []} />
        </aside>
      </div>
    </>
  );
}
