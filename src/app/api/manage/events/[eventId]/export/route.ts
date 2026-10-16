import { NextResponse, type NextRequest } from "next/server";
import { csvFilename, toCsv } from "@/lib/csv";
import { resolveEventAccess } from "@/lib/data/manage";
import { formatDateTime } from "@/lib/format";
import { formatAnswer, parseStoredFields, type FormField } from "@/lib/forms/schema";
import { createClient } from "@/lib/supabase/server";

/**
 * Authorised CSV exports. Requires the export permission for registrations
 * and attendance, or volunteer-applicant access for volunteer exports. Row
 * Level Security applies to every query as a second layer.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/manage/events/[eventId]/export">) {
  const { eventId } = await params;
  const type = request.nextUrl.searchParams.get("type") ?? "registrations";
  const resolved = await resolveEventAccess(eventId);
  if (!resolved) return new NextResponse("Not found", { status: 404 });
  const { event, access } = resolved;
  const supabase = await createClient();

  const headers = (name: string) => ({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${csvFilename(event.slug, name)}"`,
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex",
  });

  if (type === "registrations" || type === "attendance") {
    if (!access.exportData) return new NextResponse("Not found", { status: 404 });
    const [{ data: regs, error }, { data: forms }, { data: attendance }] = await Promise.all([
      supabase
        .from("registrations")
        .select("id, status, reference_code, answers, team_name, team_members, created_at, form_version_id, user:profiles!registrations_user_id_fkey(full_name, contact_email)")
        .eq("event_id", event.id)
        .order("created_at"),
      supabase.from("form_versions").select("id, version, fields").eq("event_id", event.id).order("version"),
      supabase.from("attendance_records").select("registration_id, checked_in_at, method").eq("event_id", event.id),
    ]);
    if (error) return new NextResponse("Export failed", { status: 500 });
    const checkins = new Map((attendance ?? []).map((a) => [a.registration_id, a]));

    if (type === "attendance") {
      const rows = (regs ?? [])
        .filter((r) => checkins.has(r.id))
        .map((r) => {
          const a = checkins.get(r.id)!;
          return [r.reference_code, r.user?.full_name, r.user?.contact_email, r.team_name, formatDateTime(a.checked_in_at), a.method];
        });
      return new NextResponse(toCsv(["Reference", "Name", "Email", "Team", "Checked in", "Method"], rows), { headers: headers("attendance") });
    }

    // Union of questions across form versions, in order, so old answers keep their columns.
    const questions: FormField[] = [];
    const seen = new Set<string>();
    for (const f of forms ?? []) {
      for (const q of parseStoredFields(f.fields)) {
        if (q.type === "statement" || seen.has(q.id)) continue;
        seen.add(q.id);
        questions.push(q);
      }
    }
    const rows = (regs ?? []).map((r) => {
      const answers = (r.answers ?? {}) as Record<string, unknown>;
      const team = Array.isArray(r.team_members) ? (r.team_members as { name?: string; email?: string }[]).map((m) => `${m.name ?? ""} <${m.email ?? ""}>`).join("; ") : "";
      return [
        r.reference_code,
        r.status,
        r.user?.full_name,
        r.user?.contact_email,
        formatDateTime(r.created_at),
        r.team_name,
        team,
        checkins.has(r.id) ? formatDateTime(checkins.get(r.id)!.checked_in_at) : "",
        ...questions.map((q) => formatAnswer(answers[q.id])),
      ];
    });
    return new NextResponse(
      toCsv(["Reference", "Status", "Name", "Email", "Registered", "Team name", "Team members", "Checked in", ...questions.map((q) => q.label)], rows),
      { headers: headers("registrations") },
    );
  }

  if (type === "volunteers") {
    if (!access.viewApplicants) return new NextResponse("Not found", { status: 404 });
    const { data: apps, error } = await supabase
      .from("volunteer_applications")
      .select("reference_code, status, answers, portfolio_url, created_at, role:volunteer_roles!inner(title), user:profiles!volunteer_applications_user_id_fkey(full_name, contact_email)")
      .eq("event_id", event.id)
      .order("created_at");
    if (error) return new NextResponse("Export failed", { status: 500 });
    const rows = (apps ?? []).map((a) => [
      a.reference_code,
      a.role.title,
      a.status,
      a.user?.full_name,
      a.user?.contact_email,
      formatDateTime(a.created_at),
      a.portfolio_url,
      Object.entries((a.answers ?? {}) as Record<string, unknown>)
        .map(([k, v]) => `${k}: ${formatAnswer(v)}`)
        .join(" | "),
    ]);
    return new NextResponse(toCsv(["Reference", "Role", "Status", "Name", "Email", "Applied", "Portfolio", "Answers"], rows), { headers: headers("volunteers") });
  }

  return new NextResponse("Unknown export type", { status: 400 });
}
