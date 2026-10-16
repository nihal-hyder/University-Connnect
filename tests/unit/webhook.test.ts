import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWebhook } from "@/lib/email/webhook";

const secret = `whsec_${Buffer.from("test-signing-key-0123456789").toString("base64")}`;
const now = 1_800_000_000;

function sign(id: string, ts: number, body: string) {
  const key = Buffer.from(secret.slice(6), "base64");
  return `v1,${createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64")}`;
}

describe("Resend webhook verification", () => {
  const body = JSON.stringify({ type: "email.delivered", data: { email_id: "abc" } });

  it("accepts a correctly signed, fresh request", () => {
    expect(verifyWebhook(secret, { id: "msg_1", timestamp: String(now), signature: sign("msg_1", now, body) }, body, now)).toBe(true);
  });
  it("accepts when one of several signatures matches (key rotation)", () => {
    const sig = `v1,AAAA ${sign("msg_1", now, body)}`;
    expect(verifyWebhook(secret, { id: "msg_1", timestamp: String(now), signature: sig }, body, now)).toBe(true);
  });
  it("rejects a tampered body", () => {
    expect(verifyWebhook(secret, { id: "msg_1", timestamp: String(now), signature: sign("msg_1", now, body) }, body.replace("delivered", "bounced"), now)).toBe(false);
  });
  it("rejects replays older than five minutes", () => {
    const old = now - 600;
    expect(verifyWebhook(secret, { id: "msg_1", timestamp: String(old), signature: sign("msg_1", old, body) }, body, now)).toBe(false);
  });
  it("rejects missing headers, wrong versions and an empty secret", () => {
    expect(verifyWebhook(secret, { id: null, timestamp: String(now), signature: sign("msg_1", now, body) }, body, now)).toBe(false);
    expect(verifyWebhook(secret, { id: "msg_1", timestamp: String(now), signature: sign("msg_1", now, body).replace("v1,", "v2,") }, body, now)).toBe(false);
    expect(verifyWebhook("", { id: "msg_1", timestamp: String(now), signature: sign("msg_1", now, body) }, body, now)).toBe(false);
  });
});
