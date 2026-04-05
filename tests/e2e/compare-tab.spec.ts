import { test, expect } from "@playwright/test";

test.describe("Compare Tab", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/licenses/permissive/mit");
		// Wait for the Compare tab to become visible (mapping loads async)
		await page
			.waitForSelector("#tab-compare:not([style*='display: none'])", {
				timeout: 5000,
			})
			.catch(() => {});
	});

	test("should show Compare tab for licenses with mappings", async ({
		page,
	}) => {
		const tab = page.locator("#tab-compare");
		await expect(tab).toBeVisible();
	});

	test("should display original text when Compare tab is clicked", async ({
		page,
	}) => {
		await page.click("#tab-compare");
		const panel = page.locator("#panel-compare");
		await expect(panel).toBeVisible();
		await expect(panel.locator(".compare-original-text")).toContainText(
			"Permission is hereby granted",
		);
	});

	test("should show teleprompter instruction by default", async ({
		page,
	}) => {
		await page.click("#tab-compare");
		await expect(page.locator(".teleprompter-instruction")).toBeVisible();
	});

	test("should have underlined concept spans in original text", async ({
		page,
	}) => {
		await page.click("#tab-compare");
		const spans = page.locator(".concept-span:not(.concept-filler)");
		await expect(spans.first()).toBeVisible();
		const count = await spans.count();
		expect(count).toBeGreaterThan(5);
	});

	test("should have filler spans with tooltips", async ({ page }) => {
		await page.click("#tab-compare");
		const fillers = page.locator(".concept-filler");
		await expect(fillers.first()).toBeVisible();
		const tooltip = await fillers.first().getAttribute("data-tooltip");
		expect(tooltip).toContain("Legal filler");
	});

	test("should update teleprompter on concept hover", async ({ page }) => {
		await page.click("#tab-compare");
		const firstConcept = page
			.locator(".concept-span:not(.concept-filler)")
			.first();
		await firstConcept.hover();

		const plainText = page.locator(".teleprompter-plain-text");
		await expect(plainText.first()).toBeVisible({ timeout: 2000 });
	});

	test("should dim non-active text on hover", async ({ page }) => {
		await page.click("#tab-compare");
		const firstConcept = page
			.locator(".concept-span:not(.concept-filler)")
			.first();
		await firstConcept.hover();

		const originalText = page.locator(".compare-original-text");
		await expect(originalText).toHaveClass(/concept-dimmed/);
	});

	test("should be keyboard navigable", async ({ page }) => {
		await page.click("#tab-compare");
		const firstConcept = page
			.locator(".concept-span:not(.concept-filler)")
			.first();
		await firstConcept.focus();

		await expect(firstConcept).toHaveClass(/concept-active/);
	});
});

test.describe("Compare Tab - no mapping", () => {
	test("should hide Compare tab for licenses without mappings", async ({
		page,
	}) => {
		await page.goto("/licenses/copyleft/mpl-2.0");
		// Wait for async mapping fetch to complete (and fail)
		await page.waitForTimeout(1000);
		const tab = page.locator("#tab-compare");
		await expect(tab).toBeHidden();
	});
});
