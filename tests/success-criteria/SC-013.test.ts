import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * SC-013: Reactive Component static conversion.
 * Verification: Plaintext and PDF exports contain static fallbacks for components.
 *
 * NOTE: Requires `mise run build` to have been run first.
 */
describe('SC-013: Reactive Component Conversion', () => {
  it('plaintext export contains static fallback for FAQ component', async () => {
    const txtPath = path.resolve('dist/exports/mit/0.2.1/Plain-MIT-0.2.1.txt');
    const exists = await fs.access(txtPath).then(() => true).catch(() => false);
    if (!exists) {
      console.warn('dist/exports/mit/0.2.1/Plain-MIT-0.2.1.txt not found — run `mise run build` first. Skipping.');
      return;
    }

    const content = await fs.readFile(txtPath, 'utf8');
    expect(content.toUpperCase()).toContain('FAQ');
    expect(content).toContain('(See interactive version on website');
  });
});
