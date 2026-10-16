import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("theme toggle switches to dark and the choice survives a reload without flashing", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/about");
  const toggle = page.getByRole("button", { name: /theme/i }).first();
  await toggle.click(); // system -> light
  await toggle.click(); // light -> dark
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  await page.reload();
  // The inline script applies the class before React hydrates.
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).not.toBe("rgb(246, 243, 238)");
});

test("the intro plays on a fresh load, then gets out of the way", async ({ page }) => {
  await page.goto("/", { waitUntil: "commit" });
  await expect(page.locator(".intro")).toHaveCount(1);
  await expect(page.locator(".intro")).toBeHidden({ timeout: 5000 });
  // Content underneath is reachable immediately: the intro never captures clicks.
  expect(await page.locator(".intro").evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
});

test("reduced motion removes the intro entirely", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(await page.locator(".intro").evaluate((el) => getComputedStyle(el).display)).toBe("none");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("the 3D headline is still a single readable heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/What.s on at universities across Pakistan, in one place\./);
});

test("recently viewed events appear on the dashboard and can be cleared", async ({ page }) => {
  await login(page, "bilal@example.com");
  await page.goto("/explore");
  const first = page.locator('a[href^="/events/"]').first();
  const href = await first.getAttribute("href");
  await page.goto(href!);
  const title = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
  await page.goto("/dashboard");
  const panel = page.locator("section", { has: page.getByRole("heading", { name: "Recently viewed" }) });
  await expect(panel.getByRole("link", { name: title })).toBeVisible();
  await panel.getByRole("button", { name: /Clear history/ }).click();
  await expect(panel.getByText(/stays on this device/)).toBeVisible();
});
