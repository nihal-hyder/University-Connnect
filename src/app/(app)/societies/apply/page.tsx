import type { Metadata } from "next";
import Link from "next/link";
import { ToneBadge } from "@/components/common/tone-badge";
import { SocietyApplicationForm, type ApplicationValues } from "@/components/societies/application-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requireViewer } from "@/lib/auth/session";
import { getDirectory } from "@/lib/data/events";
import { formatDate } from "@/lib/format";
import { APPLICATION_STATUS_COPY } from "@/lib/societies/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Register your society", robots: { index: false } };

const COLUMNS = `id, status, name, university_id, campus_id, department_id, scope_label, category_id, description, logo_path, website_url,
  social_links, faculty_advisor_name, faculty_advisor_title, faculty_advisor_email, president_name, president_email, contact_email,
  contact_phone, public_contact_email, team_size, recognition_details, evidence_path, applicant_role, admin_message, submitted_at` as const;

export default async function ApplyPage({ searchParams }: PageProps<"/societies/apply">) {
  const viewer = await requireViewer("/societies/apply");
  const sp = await searchParams;
  const supabase = await createClient();
  const directory = await getDirectory();

  const { data: mine } = await supabase
    .from("society_applications")
    .select(COLUMNS)
    .eq("applicant_id", viewer.user.id)
    .order("updated_at", { ascending: false });
  const apps = mine ?? [];

  const requested = typeof sp.id === "string" ? apps.find((a) => a.id === sp.id) : undefined;
  const editable = requested ?? (sp.new ? undefined : apps.find((a) => a.status === "draft" || a.status === "info_requested"));
  const inReview = apps.find((a) => a.status === "submitted" || a.status === "under_review");

  // Already waiting on review and not explicitly editing or starting another.
  if (!editable && inReview && !sp.new) {
    const copy = APPLICATION_STATUS_COPY[inReview.status];
    return (
      <div className="page-container max-w-2xl py-14 md:py-20">
        <p className="eyebrow text-signal-ink">Society verification</p>
        <h1 className="mt-2 font-display text-headline">{inReview.name}</h1>
        <div className="mt-4 flex items-center gap-3">
          <ToneBadge tone={copy.tone} dot>
            {copy.label}
          </ToneBadge>
          {inReview.submitted_at ? <span className="text-sm text-muted-foreground">Submitted {formatDate(inReview.submitted_at)}</span> : null}
        </div>
        <p className="mt-6 text-[15px] leading-7 text-muted-foreground">
          Reviewers usually respond within a few working days. You&rsquo;ll get a notification and an email when the status
          changes. If they need more information, you can update the application here.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/dashboard/societies">See my applications</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/societies/apply?new=1">Register a different society</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (requested && !(requested.status === "draft" || requested.status === "info_requested")) {
    return (
      <div className="page-container max-w-2xl py-14">
        <h1 className="font-display text-headline">This application can&rsquo;t be edited</h1>
        <p className="mt-3 text-muted-foreground">It has already been {APPLICATION_STATUS_COPY[requested.status].label.toLowerCase()}.</p>
        <Button asChild className="mt-6">
          <Link href="/dashboard/societies">Back to my societies</Link>
        </Button>
      </div>
    );
  }

  const a = editable;
  const defaults: ApplicationValues = {
    id: a?.id,
    name: a?.name ?? "",
    universityId: a?.university_id ?? viewer.profile.university_id ?? "",
    campusId: a?.campus_id ?? "",
    departmentId: a?.department_id ?? "",
    scopeLabel: a?.scope_label ?? "",
    categoryId: a?.category_id ? String(a.category_id) : "",
    description: a?.description ?? "",
    logoPath: a?.logo_path ?? null,
    websiteUrl: a?.website_url ?? "",
    socialLinks: (Array.isArray(a?.social_links) ? (a.social_links as string[]) : []).map((url) => ({ url })),
    facultyAdvisorName: a?.faculty_advisor_name ?? "",
    facultyAdvisorTitle: a?.faculty_advisor_title ?? "",
    facultyAdvisorEmail: a?.faculty_advisor_email ?? "",
    presidentName: a?.president_name ?? "",
    presidentEmail: a?.president_email ?? "",
    contactEmail: a?.contact_email ?? viewer.user.email ?? "",
    contactPhone: a?.contact_phone ?? "",
    publicContactEmail: a?.public_contact_email ?? "",
    teamSize: a?.team_size ? String(a.team_size) : "",
    recognitionDetails: a?.recognition_details ?? "",
    evidencePath: a?.evidence_path ?? null,
    applicantRole: a?.applicant_role ?? "",
  };

  return (
    <div className="page-container py-10 md:py-14">
      <header className="mb-10 max-w-3xl border-b border-border pb-8">
        <p className="eyebrow text-signal-ink">Society verification</p>
        <h1 className="mt-2 font-display text-headline">{a ? `Application: ${a.name}` : "Register your society"}</h1>
        <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
          Verified societies can publish events, take registrations and recruit volunteers. A platform reviewer checks every
          application. We only ask for what we need to confirm the society is genuine.
        </p>
      </header>
      {a?.status === "info_requested" && a.admin_message ? (
        <Alert className="mb-10 max-w-3xl border-warning/30 bg-warning-soft">
          <AlertTitle>The reviewer asked for more information</AlertTitle>
          <AlertDescription className="whitespace-pre-line">{a.admin_message}</AlertDescription>
        </Alert>
      ) : null}
      <SocietyApplicationForm key={a?.id ?? "new"} userId={viewer.user.id} directory={directory} defaults={defaults} />
    </div>
  );
}
