import { test, expect } from '@playwright/test';

/**
 * SC-004: Latency Validation.
 * Verification: Interactive elements (mapping connections) respond in < 100ms.
 */
test.describe('SC-004: Interaction Latency', () => {
  test('mapping connections appear quickly on hover', async ({ page }) => {
    await page.goto('/licenses/permissive/mit');
    
    // 1. Enable comparison mode
    const toggle = page.getByRole('button', { name: /interactive comparison/i });
    await expect(toggle).toBeVisible();
    await toggle.click();

    // 2. Find a mappable element
    const plainElement = page.locator('#plain-perm-use');
    await expect(plainElement).toBeVisible();

    // 3. Measure time to show connection
    const latency = await page.evaluate(async (id) => {
      const el = document.getElementById(id);
      if (!el) return -1;

      return new Promise<number>((resolve) => {
        const observer = new MutationObserver((mutations) => {
          const svg = document.querySelector('.mapping-connections');
          if (svg && svg.children.length > 0) {
            const endTime = performance.now();
            observer.disconnect();
            resolve(endTime - startTime);
          }
        });

        const container = document.body;
        observer.observe(container, { childList: true, subtree: true });

        const startTime = performance.now();
        // Trigger hover
        el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        
        // Timeout
        setTimeout(() => resolve(999), 1000);
      });
    }, 'plain-perm-use');

    console.log(`Mapping interaction latency: ${latency.toFixed(2)}ms`);
    
    if (latency !== -1) {
      expect(latency).toBeLessThan(100);
    }
  });
});
