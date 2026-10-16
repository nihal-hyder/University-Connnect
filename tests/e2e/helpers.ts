import { expect, type Page } from "@playwright/test";

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

export const unique = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export async function login(page: Page, email: string, password = "DemoPass123") {
  await page.goto("/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

export async function logout(page: Page) {
  await page.context().clearCookies();
}

/** Reads the confirmation link from the local mail catcher. */
export async function confirmationLink(email: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    const list = (await res.json()) as { messages: { ID: string }[] };
    if (list.messages?.length) {
      const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${list.messages[0].ID}`)).json()) as { HTML: string; Text: string };
      const match = /href="([^"]*\/auth\/confirm\?[^"]+)"/.exec(msg.HTML);
      if (match) return match[1].replaceAll("&amp;", "&");
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`No confirmation email for ${email}`);
}

/** Signs up a new account and verifies it through the emailed link. */
export async function signUpAndVerify(page: Page, name: string, email: string, password: string) {
  await page.goto("/signup");
  await page.fill("#fullName", name);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await expect(page.getByText(/check your (inbox|email)/i).first()).toBeVisible();
  const link = await confirmationLink(email);
  await page.goto(link);
  await page.waitForURL(/\/onboarding/);
}
