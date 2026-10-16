import { expect, test } from "@playwright/test";
import { cleanup, makeEvent } from "../support/db";
import { signUpAndVerify, unique } from "./helpers";

test.afterAll(cleanup);

test("student: sign up, verify, complete profile, discover, register, view ticket, cancel", async ({ page }) => {
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

  // 5–6. Register and see the confirmation.
  await page.getByRole("button", { name: "Register", exact: true }).first().click();
  await page.getByRole("button", { name: "Submit registration" }).click();
  await expect(page.getByText(/You.re registered/).first()).toBeVisible();

  // 7. View the registration and ticket.
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
