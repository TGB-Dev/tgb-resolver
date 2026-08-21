import { expect, test } from "@playwright/test";

test("renders the 404 page for unknown routes", async ({ page }) => {
  await page.goto("/this-route-does-not-exist");
  await expect(page.getByText("Not found")).toBeVisible();
});

test("create-event combobox lists extensions and selects one", async ({ page }) => {
  await page.goto("/control/");
  const addBefore = page.getByRole("button", { name: /add event before/i });
  const hasTimeline = await addBefore
    .first()
    .isVisible()
    .catch(() => false);
  test.skip(!hasTimeline, "Create Event combobox needs a loaded timeline");

  await page.locator("[data-event-id]").first().hover();
  await addBefore.first().click();

  const input = page.getByPlaceholder("Choose an extension");
  await expect(input).toBeVisible();
  await input.click();
  await input.fill("CNF");
  const option = page.getByText(/CNF\s*-\s*Run confetti/i);
  await expect(option).toBeVisible();
  await option.click();
  await expect(input).toHaveValue(/CNF/i);
});
