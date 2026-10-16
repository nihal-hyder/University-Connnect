import { expect, test } from "@playwright/test";
import { service } from "../support/db";
import { login, logout, signUpAndVerify, unique } from "./helpers";

const societyName = `E2E Society ${Date.now().toString(36)}`;

test.afterAll(async () => {
  // Remove the society, its events and the applicant created by this test.
  const db = service();
  const { data: soc } = await db.from("societies").select("id").eq("name", societyName).maybeSingle();
  if (soc) {
    await db.from("events").delete().eq("society_id", soc.id);
    await db.from("society_applications").update({ society_id: null }).eq("society_id", soc.id);
    await db.from("societies").delete().eq("id", soc.id);
  }
  const { data: apps } = await db.from("society_applications").select("applicant_id").eq("name", societyName);
  for (const a of apps ?? []) await db.auth.admin.deleteUser(a.applicant_id);
});

test("society: apply, get approved, create an event with a volunteer role, publish after review", async ({ page }) => {
  const email = `${unique("organiser")}@example.com`;
  await signUpAndVerify(page, "Test Organiser", email, "Str0ng-password!");

  // Onboarding (society path) -> profile -> application.
  await page.getByRole("link", { name: /I run a society/i }).click();
  await page.selectOption("#universityId", { index: 1 });
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.waitForURL("**/societies/apply");

  await page.fill("#name", societyName);
  await page.fill("#description", "An end-to-end test society that runs workshops and talks for students interested in testing software properly.");
  await page.fill("#applicantRole", "General Secretary");
  await page.fill("#presidentName", "Test President");
  await page.fill("#contactEmail", email);
  await page.fill("#recognitionDetails", "Registered with the Office of Student Affairs in 2024; advisor can confirm.");
  await page.getByRole("button", { name: "Submit for review" }).click();
  await page.waitForURL("**/dashboard/societies");
  await expect(page.getByText("Submitted").first()).toBeVisible();

  // Administrator approves.
  await logout(page);
  await login(page, "admin@example.com");
  await page.goto("/admin/societies");
  await page.getByRole("link", { name: societyName }).click();
  await page.getByRole("button", { name: "Approve" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText(/Approved/).first()).toBeVisible();

  // Organiser creates an event.
  await logout(page);
  await login(page, email, "Str0ng-password!");
  await page.goto("/dashboard/societies");
  await page.getByRole("link", { name: "Open" }).first().click();
  await page.getByRole("link", { name: "Create event" }).first().click();

  const title = `E2E Hackathon ${Date.now().toString(36)}`;
  await page.fill("#title", title);
  await page.selectOption("#eventType", "hackathon");
  await page.selectOption("#categoryId", { index: 1 });
  await page.fill("#description", "A weekend hackathon created by the end-to-end test suite. Teams build tools for their campus.");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.fill("#startsAt", "2030-03-01T09:00");
  await page.fill("#endsAt", "2030-03-02T18:00");
  await page.fill("#venue", "Main auditorium");
  await page.selectOption("#cityId", { index: 1 });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.fill("#capacity", "50");
  await page.getByRole("button", { name: "Continue" }).click(); // fees
  await page.getByRole("button", { name: "Continue" }).click(); // volunteers
  await page.getByRole("button", { name: "Add a role" }).click();
  await page.fill('[id="roles.0.title"]', "Registration desk");
  await page.fill('[id="roles.0.positions"]', "3");
  await page.getByRole("button", { name: "Continue" }).click(); // collaboration
  await page.getByRole("button", { name: "Continue" }).click(); // review
  await page.getByRole("button", { name: "Submit for review" }).click();
  await page.waitForURL(/\/events\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Waiting for review")).toBeVisible();

  // Administrator approves the event; it becomes public.
  await logout(page);
  await login(page, "admin@example.com");
  await page.goto("/admin/events");
  const card = page.locator("li", { hasText: title });
  await card.getByRole("button", { name: "Approve" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText(/approved and published/i).first()).toBeVisible();

  await logout(page);
  await page.goto(`/explore?q=${encodeURIComponent(title)}`);
  await expect(page.getByRole("link", { name: title }).first()).toBeVisible();
});
