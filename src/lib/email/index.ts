import "server-only";
import { Resend } from "resend";
import { siteConfig } from "@/config/site";
import { emailMode, serverEnv } from "@/lib/env/server";
import { publicEnv } from "@/lib/env/public";

/**
 * Server-side email service. Emails are never sent from request handlers:
 * the database queues them (email_outbox) and the scheduled worker calls
 * deliver() for each. In development mode (no RESEND_API_KEY) nothing is sent;
 * the outbox row is marked "logged_dev" so no screen ever claims delivery.
 */

export type OutboxEmail = {
  id: string;
  to_email: string | null;
  subject: string;
  template: string;
  payload: Record<string, unknown>;
  category: "transactional" | "reminder" | "promotional";
};

export type DeliveryResult =
  | { status: "sent"; providerId: string | null }
  | { status: "logged_dev" }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Only same-site relative links from the database become absolute URLs. */
function absoluteLink(link: unknown): string | null {
  if (typeof link !== "string" || !/^\/[^/\\]/.test(link)) return null;
  return `${publicEnv.siteUrl}${link}`;
}

export function renderEmail(email: Pick<OutboxEmail, "subject" | "payload" | "category">) {
  const title = String(email.payload.title ?? email.subject);
  const body = typeof email.payload.body === "string" ? email.payload.body : "";
  const url = absoluteLink(email.payload.link);
  const footer =
    email.category === "transactional"
      ? `You received this because of activity on your ${siteConfig.name} account.`
      : `You can turn these emails off in Profile & settings on ${siteConfig.name}.`;

  const text = [title, "", body, url ? `\nOpen: ${url}` : "", "", "—", footer, `${publicEnv.siteUrl}/dashboard/settings`].join("\n");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:#f6f3ee;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2328">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f3ee;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fcfbf8;border:1px solid #e4ded3;border-radius:12px">
        <tr><td style="padding:28px 32px 0;font-family:Georgia,serif;font-size:18px;color:#204e39">${escapeHtml(siteConfig.name)}</td></tr>
        <tr><td style="padding:16px 32px 0;font-family:Georgia,serif;font-size:24px;line-height:1.25">${escapeHtml(title)}</td></tr>
        <tr><td style="padding:12px 32px 0;font-size:15px;line-height:1.6;color:#3b3f45;white-space:pre-line">${escapeHtml(body)}</td></tr>
        ${url ? `<tr><td style="padding:24px 32px 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:#204e39;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">Open in ${escapeHtml(siteConfig.name)}</a></td></tr>` : ""}
        <tr><td style="padding:28px 32px 28px;font-size:12px;line-height:1.5;color:#6b6f75;border-top:1px solid #efe9df;margin-top:24px">${escapeHtml(footer)}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  return { html, text };
}

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  return `${user.slice(0, 2)}***@${domain ?? "?"}`;
}

let client: Resend | null = null;

export async function deliver(email: OutboxEmail): Promise<DeliveryResult> {
  if (!email.to_email) return { status: "skipped", reason: "Recipient has no email address." };
  const { html, text } = renderEmail(email);

  if (emailMode === "development") {
    // Safe metadata only: no body, no full address.
    console.info(`[email:dev] not sent id=${email.id} template=${email.template} category=${email.category} to=${maskEmail(email.to_email)} subject="${email.subject.slice(0, 80)}"`);
    return { status: "logged_dev" };
  }

  client ??= new Resend(serverEnv.resendApiKey);
  try {
    const { data, error } = await client.emails.send(
      {
        from: serverEnv.emailFrom,
        to: email.to_email,
        subject: email.subject,
        html,
        text,
        replyTo: serverEnv.emailReplyTo,
        headers: email.category === "transactional" ? undefined : { "List-Unsubscribe": `<${publicEnv.siteUrl}/dashboard/settings>` },
      },
      { idempotencyKey: `outbox-${email.id}` },
    );
    // Failed sends are retried with back-off by job_complete_email (max 5 attempts).
    if (error) return { status: "failed", error: `${error.name ?? "error"}: ${error.message}`.slice(0, 500) };
    // Resend accepted the message. Delivery to the inbox is not confirmed here.
    return { status: "sent", providerId: data?.id ?? null };
  } catch (e) {
    return { status: "failed", error: String(e).slice(0, 500) };
  }
}
