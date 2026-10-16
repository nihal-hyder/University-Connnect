import { expect, test } from "@playwright/test";
import { cleanup, makeEvent } from "../support/db";
import { login, signUpAndVerify, unique } from "./helpers";

test.afterAll(cleanup);

test("student: sign up, verify, profile, discover, register, organiser approves, ticket, cancel", async ({ page }) => {
  const title = `E2E Student Workshop ${Date.now()}`;
  const event = await makeEvent({ title, capacity: 20 });
  const email = `${unique("student")}@example.com`;

  // 1–2. Sign up and verify through the real confirmation email.
  await signUpAndVerify(page, "Test Student", email, "Str0ng-password!");

  // 3. Complete the student profile.
  await page.getByRole("link", { name: /I'm a student/i }).click();
  await page.selectOption("#universityId", { index: 1 });
  await page.getByRole("group", { name: "Interests" }).getByText("Software & AI").click();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: /Hello, Test/ })).toBeVisible();

  // 4. Discover the event through search.
  await page.goto("/explore");
  await page.fill("#explore-q", title);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("link", { name: title }).first().click();
  await page.waitForURL(`**/events/${event.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("E2E Student Workshop");

  // 5–6. Register: it waits for the organisers, no ticket yet.
  await page.getByRole("button", { name: "Register", exact: true }).first().click();
  await page.getByRole("button", { name: "Submit registration" }).click();
  await expect(page.getByText("Registration received").first()).toBeVisible();
  await page.goto("/dashboard/registrations");
  await expect(page.getByText("Awaiting approval").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "View ticket" })).toHaveCount(0);
  await page.context().clearCookies();

  // The society's organiser confirms the registration.
  await login(page, "sara@example.com");
  await page.goto(`/manage/computing-ai-society-nust/events/${event.id}/registrations?status=pending`);
  await page.getByRole("button", { name: "Confirm" }).first().click();
  await expect(page.getByText(/Registration confirmed/).first()).toBeVisible();
  await page.context().clearCookies();

  // 7. The student now has a ticket.
  await login(page, email, "Str0ng-password!");
  await page.goto("/dashboard/registrations");
  await page.getByRole("link", { name: "View ticket" }).first().click();
  await expect(page.getByRole("img", { name: /QR code for ticket/ })).toBeVisible();
  await expect(page.getByText("Confirmed").first()).toBeVisible();

  // 8. Cancel.
  await page.getByRole("button", { name: "Cancel registration" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancel registration" }).click();
  await expect(page.getByText("Registration cancelled").first()).toBeVisible();
  await expect(page.getByText(/ticket with a QR code appears here/)).toBeVisible();
});
