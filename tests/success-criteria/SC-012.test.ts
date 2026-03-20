import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';

/**
 * SC-012: Build Performance.
 * Verification: Full site build completes in < 60 seconds.
 *
 * NOTE: This test runs a full production build and is intentionally skipped in the
 * standard unit-test suite. It requires mise and Typst to be installed, takes
 * >30 s, and belongs in a dedicated build-validation workflow step.
 * Run it explicitly with: `bunx vitest run tests/success-criteria/SC-012.test.ts`
 */
const RUN_BUILD_TEST = process.env.RUN_BUILD_TESTS === 'true';

describe('SC-012: Build Performance', () => {
  it.skipIf(!RUN_BUILD_TEST)('full production build completes within 60 seconds', () => {
    const startTime = Date.now();

    const result = spawnSync('bun', ['run', 'build'], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });

    const duration = (Date.now() - startTime) / 1000;
    console.log(`Build duration: ${duration.toFixed(2)} seconds`);

    expect(result.status).toBe(0);
    expect(duration).toBeLessThan(60);
  });
});
