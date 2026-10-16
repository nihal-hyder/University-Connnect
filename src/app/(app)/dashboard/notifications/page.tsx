import type { Metadata } from "next";
import Link from "next/link";
import { Bell } from "lucide-react";
import { ActionButton } from "@/components/common/action-button";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/components/common/pagination";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { markNotificationsRead } from "@/lib/actions/profile";
import { requireViewer } from "@/lib/auth/session";
import { formatDateTime, relativeFromNow } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };

const PAGE_SIZE = 25;

export default async function NotificationsPage({ searchParams }: PageProps<"/dashboard/notifications">) {
  const viewer = await requireViewer("/dashboard/notifications");
  const { page: rawPage } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);
  const supabase = await createClient();
  const { data, count } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at", { count: "exact" })
    .eq("user_id", viewer.user.id)
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const items = data ?? [];
  const unreadIds = items.filter((n) => !n.read_at).map((n) => n.id);

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Updates about your registrations, applications, societies and events you follow."
        actions={
          unreadIds.length ? (
            <ActionButton variant="outline" action={markNotificationsRead.bind(null, undefined)} successMessage="All caught up.">
              Mark all as read
            </ActionButton>
          ) : null
        }
      />
      {items.length ? (
        <ul className="divide-y divide-border border-y border-border">
          {items.map((n) => (
            <li key={n.id} className={cn("relative flex gap-4 py-4", !n.read_at && "bg-signal-soft/25")}>
              <span className={cn("mt-2 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-signal")} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className={cn("text-[15px]", !n.read_at && "font-medium")}>
                  {n.link ? (
                    <Link href={n.link} className="hover:underline">
                      {n.title}
                    </Link>
                  ) : (
                    n.title
                  )}
                  {!n.read_at ? <span className="sr-only"> (unread)</span> : null}
                </p>
                {n.body ? <p className="mt-0.5 text-sm leading-6 text-muted-foreground">{n.body}</p> : null}
                <p className="mt-1 text-xs text-muted-foreground" title={formatDateTime(n.created_at)}>
                  {relativeFromNow(n.created_at)}
                </p>
              </div>
              {!n.read_at ? (
                <ActionButton size="sm" variant="ghost" className="self-start" action={markNotificationsRead.bind(null, [n.id])} successMessage="Marked as read.">
                  Mark read
                </ActionButton>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Bell />} title="No notifications yet" description="When something changes on your registrations or applications, you'll see it here." />
      )}
      <Pagination
        className="mt-8"
        page={page}
        pageCount={Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))}
        hrefFor={(p) => `/dashboard/notifications?page=${p}`}
      />
    </>
  );
}
