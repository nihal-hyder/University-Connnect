import { describe, expect, it } from "vitest";

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= "test";
process.env.NEXT_PUBLIC_SITE_URL = "https://campus.example";
delete process.env.RESEND_API_KEY;

const { renderEmail, deliver } = await import("@/lib/email");

describe("email rendering", () => {
  it("escapes user-controlled text", () => {
    const { html } = renderEmail({ subject: "x", category: "transactional", payload: { title: "<img src=x onerror=alert(1)>", body: "Tom & <b>Jerry</b>" } });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("Tom &amp; &lt;b&gt;Jerry&lt;/b&gt;");
  });
  it("only links to relative paths on this site", () => {
    expect(renderEmail({ subject: "x", category: "reminder", payload: { link: "/dashboard" } }).html).toContain("https://campus.example/dashboard");
    expect(renderEmail({ subject: "x", category: "reminder", payload: { link: "https://evil.example" } }).html).not.toContain("evil.example");
    expect(renderEmail({ subject: "x", category: "reminder", payload: { link: "//evil.example" } }).html).not.toContain("evil.example");
  });
  it("offers preference management on non-essential mail only", () => {
    expect(renderEmail({ subject: "x", category: "promotional", payload: {} }).text).toContain("turn these emails off");
    expect(renderEmail({ subject: "x", category: "transactional", payload: {} }).text).not.toContain("turn these emails off");
  });
});

describe("development delivery mode", () => {
  it("never reports a dev email as sent", async () => {
    const result = await deliver({ id: "1", to_email: "a@b.pk", subject: "Hi", template: "generic", payload: {}, category: "transactional" });
    expect(result.status).toBe("logged_dev");
  });
  it("skips recipients without an address", async () => {
    const result = await deliver({ id: "1", to_email: null, subject: "Hi", template: "generic", payload: {}, category: "transactional" });
    expect(result.status).toBe("skipped");
  });
});
