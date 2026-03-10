import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage should load', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Plain License/);
    await expect(page.locator('h1').first()).toContainText('Plain License');
  });

  test('license page should load', async ({ page }) => {
    // Navigate to a specific license (MIT)
    await page.goto('/licenses/permissive/mit/');
    await expect(page.locator('.license-container h1').first()).toContainText('MIT License');
    await expect(page.locator('.at-a-glance')).toBeVisible();
  });

  test('copy to clipboard should work', async ({ page, context, browserName }) => {
    // Grant clipboard permissions only for Chromium
    if (browserName === 'chromium') {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    }
    
    await page.goto('/licenses/permissive/mit/');
    
    // Check if the copy button is visible
    const copyButton = page.locator('#copy-clipboard');
    await expect(copyButton).toBeVisible();
    await copyButton.click();
    
    // Check for text change
    await expect(copyButton).toHaveText(/Copied/i);

    // Verify clipboard content in Chromium
    if (browserName === 'chromium') {
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toContain('MIT License');
      expect(clipboardText).not.toContain('{{block:');
    }
  });
});
