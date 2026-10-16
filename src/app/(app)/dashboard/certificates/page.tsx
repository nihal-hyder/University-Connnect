import type { Metadata } from "next";
import Link from "next/link";
import { Award } from "lucide-react";
import { CertificateDownloads } from "@/components/certificates/download-buttons";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { requireViewer } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Certificates" };

export default async function CertificatesPage() {
  const viewer = await requireViewer("/dashboard/certificates");
  const supabase = await createClient();
  const { data } = await supabase
    .from("certificates")
    .select("id, code, role_title, event_title, society_name, event_date, issued_at, revoked_at")
    .eq("user_id", viewer.user.id)
    .order("issued_at", { ascending: false });
  const items = data ?? [];

  return (
    <>
      <PageHeader
        title="Certificates"
        description="Issued by organisers after you completed a volunteer role. Each has a public verification link."
      />
      {items.length ? (
        <ul className="divide-y divide-border border-y border-border">
          {items.map((c) => (
            <li key={c.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">
                  {c.role_title} · {c.event_title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {c.society_name} · issued {formatDate(c.issued_at)}
                  {c.revoked_at ? " · revoked" : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {!c.revoked_at ? <CertificateDownloads code={c.code} /> : null}
                <Link href={`/certificates/${c.code}`} className="text-sm font-medium text-primary hover:underline">
                  View and share
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<Award />}
          title="No certificates yet"
          description="Certificates are issued by organisers when you complete a volunteer role, based on actual participation. They are never automatic."
        />
      )}
    </>
  );
}
