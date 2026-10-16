import { expect, test } from "@playwright/test";
import { cleanup, makeEvent } from "../support/db";
import { login } from "./helpers";

test.afterAll(cleanup);

test("event page offers WhatsApp sharing, a preview image and calendar export", async ({ page, request }) => {
  const event = await makeEvent({ title: `E2E Share ${Date.now()}` });
  await page.goto(`/events/${event.slug}`);

  await page.getByRole("button", { name: "Share" }).click();
  const wa = page.getByRole("menuitem", { name: "WhatsApp" });
  const href = await wa.getAttribute("href");
  expect(href).toMatch(/^https:\/\/wa\.me\/\?text=/);
  expect(decodeURIComponent(href!)).toContain(`/events/${event.slug}`);
  await page.keyboard.press("Escape");

  const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content");
  const img = await request.get(new URL(ogImage!).pathname + new URL(ogImage!).search);
  expect(img.status()).toBe(200);
  expect(img.headers()["content-type"]).toContain("image/png");

  await page.getByRole("button", { name: "Add to calendar" }).click();
  await expect(page.getByRole("menuitem", { name: "Google Calendar" })).toHaveAttribute("href", /calendar\.google\.com/);
  const ics = await request.get(`/events/${event.slug}/calendar.ics`);
  expect(ics.headers()["content-type"]).toContain("text/calendar");
  expect(await ics.text()).toContain("BEGIN:VEVENT");
});

test("organisers send an announcement and participants receive it", async ({ page }) => {
  const title = `E2E Announce ${Date.now()}`;
  const event = await makeEvent({ title });
  // Ayesha registers.
  await login(page, "ayesha@example.com");
  await page.goto(`/events/${event.slug}`);
  await page.getByRole("button", { name: "Register", exact: true }).first().click();
  await page.getByRole("button", { name: "Submit registration" }).click();
  await expect(page.getByText("Registration received").first()).toBeVisible();
  await page.context().clearCookies();

  // Sara announces.
  await login(page, "sara@example.com");
  await page.goto(`/manage/computing-ai-society-nust/events/${event.id}/announcements`);
  await page.selectOption("#ann-audience", "all_registrants");
  await page.fill("#ann-title", "Bring your student card");
  await page.fill("#ann-body", "Security will check student cards at the main gate.");
  await page.getByRole("button", { name: /^Send/ }).click();
  await expect(page.getByText(/Sent to 1 person/)).toBeVisible();
  await expect(page.getByText("1 recipient")).toBeVisible();
  await page.context().clearCookies();

  // Ayesha sees it.
  await login(page, "ayesha@example.com");
  await page.goto("/dashboard/notifications");
  await expect(page.getByText(`${title}: Bring your student card`)).toBeVisible();
});
