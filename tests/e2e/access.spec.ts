import { expect, test } from "@playwright/test";
import { service, SOCIETY } from "../support/db";
import { login } from "./helpers";

test("signed-out visitors are sent to log in, keeping the destination", async ({ page }) => {
  await page.goto("/dashboard/registrations");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Fregistrations/);
});

test("open redirects through ?next= are refused", async ({ page }) => {
  await page.goto("/login?next=https://evil.example/");
  await page.fill('input[name="email"]', "ayesha@example.com");
  await page.fill('input[name="password"]', "DemoPass123");
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  expect(new URL(page.url()).host).toBe("localhost:3000");
});

test("students cannot open admin or another society's workspace", async ({ page }) => {
  await login(page, "ayesha@example.com");
  expect((await page.goto("/admin"))?.status()).toBe(404);
  expect((await page.goto("/manage/computing-ai-society-nust"))?.status()).toBe(404);
});

test("administrators land on the admin area and can open any society workspace", async ({ page }) => {
  await login(page, "admin@example.com");
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Platform overview" })).toBeVisible();
  await page.goto("/manage/entrepreneurship-club-lums");
  await expect(page.getByText("Platform admin (full access)")).toBeVisible();
});

test("certificates download as PDF, PNG and JPG for the recipient only", async ({ page }) => {
  await login(page, "bilal@example.com");
  await page.goto("/dashboard/certificates");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Download PDF" }).first().click()]);
  expect(download.suggestedFilename()).toMatch(/^certificate-CC-.+\.pdf$/);
  for (const [format, type, magic] of [["png", "image/png", "89504e47"], ["jpg", "image/jpeg", "ffd8ff"]] as const) {
    const res = await page.request.get(`/api/certificates/CC-DEMO-GIT1-2026/download?format=${format}`);
    expect(res.headers()["content-type"]).toBe(type);
    expect((await res.body()).subarray(0, 4).toString("hex")).toContain(magic);
  }
  await page.context().clearCookies();
  await login(page, "ayesha@example.com");
  expect((await page.request.get("/api/certificates/CC-DEMO-GIT1-2026/download?format=pdf")).status()).toBe(404);
});

test("CSV exports are refused without the export permission", async ({ page }) => {
  const { data: event } = await service().from("events").select("id").eq("society_id", SOCIETY.computing).eq("status", "published").limit(1).single();
  await login(page, "hamza@example.com"); // volunteer coordinator: no export permission
  expect((await page.request.get(`/api/manage/events/${event!.id}/export?type=registrations`)).status()).toBe(404);
  expect((await page.request.get(`/api/manage/events/${event!.id}/export?type=volunteers`)).status()).toBe(200);
});

test("public pages have no horizontal scroll", async ({ page }) => {
  for (const path of ["/", "/explore", "/opportunities", "/societies", "/about"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow, path).toBe(false);
  }
});
