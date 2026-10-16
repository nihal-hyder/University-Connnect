import { expect, test } from "@playwright/test";

/**
 * Offline tickets need the service worker, which only registers in production
 * builds. Run with a production server:
 *   npm run build && npx next start -p 3100
 *   PWA_BASE_URL=http://localhost:3100 npx playwright test pwa
 */
const base = process.env.PWA_BASE_URL;
test.skip(!base, "Set PWA_BASE_URL to a production server (next start) to run.");

test("the app is installable and a viewed ticket opens offline", async ({ page, context, request }) => {
  const manifest = await request.get(`${base}/manifest.webmanifest`);
  expect(manifest.ok()).toBe(true);
  const m = await manifest.json();
  expect(m.display).toBe("standalone");
  expect(m.icons.some((i: { sizes: string }) => i.sizes === "512x512")).toBe(true);

  await page.goto(`${base}/login`);
  await page.fill('input[name="email"]', "ayesha@example.com");
  await page.fill('input[name="password"]', "DemoPass123");
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));

  await page.goto(`${base}/dashboard/registrations`);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Reload so the now-active worker controls the page, then open a ticket.
  await page.reload();
  await page.getByRole("link", { name: "View ticket" }).first().click();
  await expect(page.getByRole("img", { name: /QR code for ticket/ })).toBeVisible();
  const ticketUrl = page.url();
  await page.waitForTimeout(500); // let the worker store its copy

  await context.setOffline(true);
  await page.goto(ticketUrl);
  await expect(page.getByRole("img", { name: /QR code for ticket/ })).toBeVisible();

  // Other pages fall back to the offline page.
  await page.goto(`${base}/explore`);
  await expect(page.getByRole("heading", { name: "You’re offline" })).toBeVisible();
  await context.setOffline(false);

  // Signing out removes the offline copy.
  await page.goto(`${base}/dashboard`);
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page.waitForURL(`${base}/`);
  const remaining = await page.evaluate(async () => (await caches.open("cc-tickets").then((c) => c.keys())).length);
  expect(remaining).toBe(0);
});
