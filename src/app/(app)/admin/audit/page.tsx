import type { Metadata } from "next";
import { Pagination } from "@/components/common/pagination";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { requireAdmin } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Audit log" };

const PAGE_SIZE = 50;

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const action = typeof sp.action === "string" ? sp.action.replace(/[^a-z_.]/g, "").slice(0, 60) : "";
  const supabase = await createClient();
  let query = supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, created_at, details, actor:profiles(full_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (action) query = query.ilike("action", `${action}%`);
  const { data, count } = await query;

  return (
    <>
      <PageHeader title="Audit log" description="Security-relevant changes recorded by the database: roles, ownership, publishing, decisions." />
      <form method="get" className="mb-6 flex max-w-sm gap-2">
        <label htmlFor="audit-action" className="sr-only">
          Filter by action
        </label>
        <input
          id="audit-action"
          name="action"
          defaultValue={action}
          placeholder="e.g. society. or event.published"
          className="h-10 w-full rounded-lg border border-input bg-surface px-3 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
        />
      </form>
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[44rem] text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">When</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Action</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Actor</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Entity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(data ?? []).map((a) => (
              <tr key={a.id} className="align-top">
                <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">{formatDateTime(a.created_at)}</td>
                <td className="px-4 py-2 font-mono text-xs">{a.action}</td>
                <td className="px-4 py-2">{a.actor?.full_name ?? "System"}</td>
                <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                  {a.entity_type}
                  {a.entity_id ? `:${a.entity_id.slice(0, 8)}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination className="mt-8" page={page} pageCount={Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))} hrefFor={(p) => `/admin/audit?page=${p}${action ? `&action=${action}` : ""}`} />
    </>
  );
}
