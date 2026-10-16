import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { deliver, type OutboxEmail } from "@/lib/email";
import { emailMode, serverEnv } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Scheduled worker. Call every 5–15 minutes with
 *   Authorization: Bearer <JOB_SECRET>
 * (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; set CRON_SECRET to
 * the same value.) Safe to call repeatedly: reminders are idempotent by key
 * and emails are claimed with row locks, so overlapping runs never double-send.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(request: NextRequest) {
  const expected = serverEnv.jobSecret;
  if (!expected || expected.length < 16) return false;
  const header = request.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function run(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "SUPABASE_SECRET_KEY is not configured." }, { status: 503 });
  }

  const { data: runRow } = await admin.from("job_runs").insert({ job: "process" }).select("id").single();
  const summary: { [key: string]: Json | undefined } = { email_mode: emailMode };
  let ok = true;

  try {
    const { data: reminders, error: remindersError } = await admin.rpc("job_enqueue_reminders");
    if (remindersError) throw new Error(`reminders: ${remindersError.message}`);
    summary.reminders = reminders as Json;

    const counts = { sent: 0, logged_dev: 0, skipped: 0, failed: 0 };
    // Bounded batches keep each run well inside serverless time limits.
    for (let batch = 0; batch < 5; batch++) {
      const { data: emails, error } = await admin.rpc("job_claim_emails", { p_limit: 20 });
      if (error) throw new Error(`claim: ${error.message}`);
      if (!emails?.length) break;
      for (const row of emails) {
        const result = await deliver({ ...row, payload: (row.payload ?? {}) as Record<string, unknown> } as OutboxEmail);
        counts[result.status]++;
        await admin.rpc("job_complete_email", {
          p_id: row.id,
          p_status: result.status,
          p_provider_id: result.status === "sent" ? result.providerId ?? undefined : undefined,
          p_error: result.status === "failed" ? result.error : result.status === "skipped" ? result.reason : undefined,
        });
      }
    }
    summary.emails = counts;
  } catch (e) {
    ok = false;
    summary.error = String(e).slice(0, 500);
  }

  if (runRow) {
    await admin.from("job_runs").update({ finished_at: new Date().toISOString(), ok, summary }).eq("id", runRow.id);
  }
  return NextResponse.json({ ok, ...summary }, { status: ok ? 200 : 500 });
}

export const GET = run;
export const POST = run;
