import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/dashboard-shell";
import { SocietyProfileForm } from "@/components/manage/society-profile-form";
import { requireSocietyAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Public profile" };

export default async function SocietyProfilePage({ params }: PageProps<"/manage/[slug]/profile">) {
  const { slug } = await params;
  const ctx = await requireSocietyAccess(slug, "manage_profile");
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("societies")
    .select("id, university_id, scope_label, category_id, description, logo_path, website_url, social_links, public_contact_email, campus_id, department_id")
    .eq("id", ctx.society.id)
    .single();
  const [categories, campuses, departments] = await Promise.all([
    supabase.from("event_categories").select("id, name").eq("is_active", true).order("sort_order"),
    supabase.from("campuses").select("id, name").eq("university_id", s!.university_id).eq("is_active", true).order("name"),
    supabase.from("departments").select("id, name").eq("university_id", s!.university_id).eq("is_active", true).order("name"),
  ]);

  return (
    <>
      <PageHeader
        title="Public profile"
        description={
          <>
            What students see on{" "}
            <Link href={`/societies/${slug}`} className="text-primary hover:underline">
              your society page
            </Link>
            .
          </>
        }
      />
      <SocietyProfileForm
        societyId={ctx.society.id}
        categories={categories.data ?? []}
        campuses={campuses.data ?? []}
        departments={departments.data ?? []}
        defaults={{
          scopeLabel: s?.scope_label ?? "",
          categoryId: s?.category_id ? String(s.category_id) : "",
          description: s?.description ?? "",
          logoPath: s?.logo_path ?? null,
          websiteUrl: s?.website_url ?? "",
          socialLinks: (Array.isArray(s?.social_links) ? (s.social_links as string[]) : []).map((url) => ({ url })),
          publicContactEmail: s?.public_contact_email ?? "",
          campusId: s?.campus_id ?? "",
          departmentId: s?.department_id ?? "",
        }}
      />
    </>
  );
}
