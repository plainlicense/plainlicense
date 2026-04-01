import { expect, test } from "@playwright/test";

test.describe("CMS Editor Interface", () => {
  test("admin page should load and show login options", async ({ page }) => {
    await page.goto("/admin/");

    // Sveltia CMS sets its own title
    await expect(page).toHaveTitle(/Sveltia CMS/i);

    // Verify login options are present
    const body = page.locator("body");
    await expect(body).toContainText(/Sveltia CMS/i);
    await expect(body).toContainText(/Work with Local Repository/i);
    await expect(body).toContainText(/Sign In with GitHub/i);
  });

  test("local repository option is available", async ({ page }) => {
    await page.goto("/admin/");

    // The "Work with Local Repository" button should be visible
    const localBtn = page.getByRole("button", {
      name: /Work with Local Repository/i,
    });
    await expect(localBtn).toBeVisible();
  });
});
