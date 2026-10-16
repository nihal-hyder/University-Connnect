import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies a Resend (Svix-format) webhook signature.
 *   signed content = `${svix-id}.${svix-timestamp}.${raw body}`
 *   key            = base64-decoded secret after the "whsec_" prefix
 *   header         = space-separated "v1,<base64 HMAC-SHA256>" entries
 * Rejects timestamps more than 5 minutes from now (replay protection).
 */
export function verifyWebhook(
  secret: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  rawBody: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  const { id, timestamp, signature } = headers;
  if (!secret || !id || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > 300) return false;

  const key = Buffer.from(secret.startsWith("whsec_") ? secret.slice(6) : secret, "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest();

  return signature.split(" ").some((part) => {
    const [version, value] = part.split(",");
    if (version !== "v1" || !value) return false;
    const given = Buffer.from(value, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

/** Maps Resend event types to our delivery states. */
export const RESEND_EVENT_MAP: Record<string, "delivered" | "bounced" | "complained"> = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
};
