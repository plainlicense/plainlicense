import { test, expect } from '@playwright/test';

/**
 * SC-014: Session Persistence.
 * Verification: Comparison mode preference persists across navigation.
 */
test.describe('SC-014: Session Persistence', () => {
  test('comparison mode preference persists after navigation', async ({ page }) => {
    await page.goto('/licenses/permissive/mit');
    
    // 1. Enable comparison mode
    const toggle = page.getByRole('button', { name: /interactive comparison/i });
    
    await expect(toggle).toBeVisible();
    await toggle.click();
    
    // Check if active (e.g., class on container)
    await expect(page.locator('.license-container')).toHaveClass(/comparison-active/);
    
    // 2. Navigate to another license
    await page.goto('/licenses/copyleft/mpl-20');
    
    // 3. Verify it's still active
    await expect(page.locator('.license-container')).toHaveClass(/comparison-active/);
  });
});
