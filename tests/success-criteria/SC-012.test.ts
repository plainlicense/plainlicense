import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';

/**
 * SC-012: Build Performance.
 * Verification: Full site build completes in < 60 seconds.
 */
describe('SC-012: Build Performance', () => {
  it('full production build completes within 60 seconds', () => {
    const startTime = Date.now();
    
    // Run the build command
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
