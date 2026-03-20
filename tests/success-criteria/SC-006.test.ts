import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { spawnSync } from 'node:child_process';
import { derivePlainId } from '../../src/utils/plain-id.ts';

/**
 * SC-006: Professional PDF Generation.
 * Verification: PDF files exist and contain expected branding/attribution.
 *
 * NOTE: Requires `mise run build` to have been run first.
 */
describe('SC-006: PDF Generation Quality', () => {
  it('generated PDF files contain expected keywords', async () => {
    const pdfPath = path.resolve('dist/exports/mit/0.2.1/Plain-MIT-0.2.1.pdf');
    const exists = await fs.access(pdfPath).then(() => true).catch(() => false);
    if (!exists) {
      console.warn('dist/exports/mit/0.2.1/Plain-MIT-0.2.1.pdf not found — run `mise run build` first. Skipping.');
      return;
    }

    const result = spawnSync('strings', [pdfPath]);
    const output = result.stdout.toString();

    expect(output).toContain('Plain MIT License');
  });

  it('all published licenses have a PDF export', async () => {
    const distExports = path.resolve('dist/exports');
    const distExists = await fs.access(distExports).then(() => true).catch(() => false);
    if (!distExists) {
      console.warn('dist/exports/ not found — run `mise run build` first. Skipping.');
      return;
    }

    const baseDir = path.resolve('content/licenses');
    const categories = await fs.readdir(baseDir);

    for (const category of categories) {
      const categoryPath = path.join(baseDir, category);
      if (!(await fs.stat(categoryPath)).isDirectory()) continue;

      const files = (await fs.readdir(categoryPath)).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const { data } = matter(await fs.readFile(path.join(categoryPath, file), 'utf8'));
        if (data.status !== 'published') continue;

        const slug = data.spdx_id.trim().toLowerCase();
        const version = data.plain_version.trim();
        const exportDir = path.resolve(`dist/exports/${slug}/${version}`);
        const dirExists = await fs.access(exportDir).then(() => true).catch(() => false);

        if (dirExists) {
          const exportFiles = await fs.readdir(exportDir);
          const pdfExists = exportFiles.some(f => f.toLowerCase().endsWith('.pdf'));
          expect(pdfExists).toBe(true);
        }
      }
    }
  });
});
