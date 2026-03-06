import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * SC-013: Reactive Component static conversion.
 * Verification: Plaintext and PDF exports contain static fallbacks for components.
 */
describe('SC-013: Reactive Component Conversion', () => {
  it('plaintext export contains static fallback for FAQ component', async () => {
    const txtPath = path.resolve('public/exports/mit/v0.2.1/MIT.txt');
    const content = await fs.readFile(txtPath, 'utf8');
    
    expect(content.toUpperCase()).toContain('FAQ');
    expect(content).toContain('(See interactive version on website)');
  });
});
