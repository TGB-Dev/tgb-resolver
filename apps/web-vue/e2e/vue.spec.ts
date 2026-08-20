import { expect, test } from "@playwright/test";

// See here how to get started:
// https://playwright.dev/docs/intro
test("renders the audience route", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).not.toBeEmpty();
});

test("renders the control route shell", async ({ page }) => {
  await page.goto("/control/");
  await expect(page.locator("body")).not.toBeEmpty();
  await expect(
    page.getByText("No show loaded").or(page.getByText("No timeline events")),
  ).toBeVisible();
});
