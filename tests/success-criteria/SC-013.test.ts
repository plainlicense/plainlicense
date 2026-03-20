import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

const txtPath = path.resolve('dist/exports/mit/0.2.1/Plain-MIT-0.2.1.txt');
const hasExport = await fs.access(txtPath).then(() => true).catch(() => false);

/**
 * SC-013: Reactive Component static conversion.
 * Verification: Plaintext and PDF exports contain static fallbacks for components.
 *
 * Requires `mise run build` to have been run first.
 */
describe('SC-013: Reactive Component Conversion', () => {
  it.skipIf(!hasExport)('plaintext export contains static fallback for FAQ component', async () => {
    const content = await fs.readFile(txtPath, 'utf8');
    expect(content.toUpperCase()).toContain('FAQ');
    expect(content).toContain('(See interactive version on website)');
  });
});
