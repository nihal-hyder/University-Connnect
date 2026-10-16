import { NextResponse, type NextRequest } from "next/server";
import { RESEND_EVENT_MAP, verifyWebhook } from "@/lib/email/webhook";
import { serverEnv } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Resend delivery webhook: records delivered / bounced / complained against
 * the outbox row. Unsigned or stale requests are rejected. Unknown event types
 * are acknowledged and ignored so Resend doesn't retry them.
 */
export async function POST(request: NextRequest) {
  if (!serverEnv.resendWebhookSecret) {
    return NextResponse.json({ error: "RESEND_WEBHOOK_SECRET is not configured." }, { status: 503 });
  }
  const raw = await request.text();
  const ok = verifyWebhook(
    serverEnv.resendWebhookSecret,
    { id: request.headers.get("svix-id"), timestamp: request.headers.get("svix-timestamp"), signature: request.headers.get("svix-signature") },
    raw,
  );
  if (!ok) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  let event: { type?: string; created_at?: string; data?: { email_id?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const state = event.type ? RESEND_EVENT_MAP[event.type] : undefined;
  const providerId = event.data?.email_id;
  if (!state || !providerId) return NextResponse.json({ ignored: true });

  const { data, error } = await createAdminClient().rpc("job_record_email_event", {
    p_provider_id: providerId,
    p_event: state,
    p_at: event.created_at ?? new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: "Could not record event" }, { status: 500 });
  return NextResponse.json({ recorded: data });
}
