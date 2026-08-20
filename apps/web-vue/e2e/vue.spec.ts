import { expect, test } from "@playwright/test";

// See here how to get started:
// https://playwright.dev/docs/intro
test("renders the audience route", async ({ page }) => {
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));
  await page.goto("/");
  await expect(page.locator("body")).not.toBeEmpty();
  await expect(page.getByText("Audience")).toBeVisible();
  expect(errors).toEqual([]);
});

test("renders the control route shell", async ({ page }) => {
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));
  await page.goto("/control/");
  await expect(page.locator("body")).not.toBeEmpty();
  await expect(
    page.getByText("No show loaded").or(page.getByText("No timeline events")),
  ).toBeVisible();
  await expect(page.locator('[data-scope="splitter"][data-part="root"]')).toBeVisible();
  const fullscreen = page.getByRole("button", { name: /fullscreen/i });
  await expect(fullscreen).toBeVisible();
  const box = await fullscreen.boundingBox();
  expect(box).not.toBeNull();
  expect(Math.abs((box?.width ?? 0) - (box?.height ?? 0))).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});
