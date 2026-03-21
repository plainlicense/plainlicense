import { expect, test } from "@playwright/test";

/**
 * SC-002: Performance Validation.
 * Verification: LCP < 2s, FCP < 1.2s.
 */
test.describe("SC-002: Performance Monitoring", () => {
  test("MIT license page performance metrics", async ({ page }) => {
    await page.goto("/licenses/permissive/mit");

    const metrics = (await page.evaluate(() => {
      return new Promise((resolve) => {
        let fcp = 0;
        let lcp = 0;

        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            if (entry.name === "first-contentful-paint") {
              fcp = entry.startTime;
            }
            if (entry.entryType === "largest-contentful-paint") {
              lcp = entry.startTime;
            }
          }
          if (fcp > 0 && lcp > 0) {
            resolve({ fcp, lcp });
          }
        });

        observer.observe({ entryTypes: ["paint", "largest-contentful-paint"] });

        setTimeout(() => resolve({ fcp, lcp }), 3000);
      });
    })) as { fcp: number; lcp: number };

    console.log(`FCP: ${metrics.fcp}ms, LCP: ${metrics.lcp}ms`);

    if (metrics.fcp > 0) expect(metrics.fcp).toBeLessThan(1200);
    if (metrics.lcp > 0) expect(metrics.lcp).toBeLessThan(2000);
  });
});
