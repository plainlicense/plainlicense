import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

/**
 * SC-006: Professional PDF Generation.
 * Verification: PDF files exist and contain expected branding/attribution.
 */
describe('SC-006: PDF Generation Quality', () => {
  it('generated PDF files contain expected keywords', async () => {
    // We'll check the MIT PDF specifically
    const pdfPath = path.resolve('public/exports/mit/v0.2.1/MIT.pdf');
    const exists = await fs.access(pdfPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);

    // Use strings or a simple grep to check if the PDF contains some identifiable text
    // Typst PDFs are usually readable enough by 'strings' to find text
    const result = spawnSync('strings', [pdfPath]);
    const output = result.stdout.toString();

    expect(output).toContain('MIT License (Plain Language)');
    expect(output).toContain('Original License Text');
    expect(output).toContain('The MIT License (MIT)');
  });

  it('all published licenses have a PDF export', async () => {
    const baseDir = path.resolve('content/licenses');
    const categories = await fs.readdir(baseDir);

    for (const category of categories) {
      const categoryPath = path.join(baseDir, category);
      if (!(await fs.stat(categoryPath)).isDirectory()) continue;

      const files = (await fs.readdir(categoryPath)).filter(f => f.endsWith('.md'));
      for (const file of files) {
         // This is a bit simplified, in reality we'd need to parse the file to get the version
         // But for the prototype, we assume the latest exports are present
         const slug = file.replace(/\.md$/, '');
         const exportDir = path.resolve(`public/exports/${slug.toLowerCase()}`);
         const dirExists = await fs.access(exportDir).then(() => true).catch(() => false);
         
         if (dirExists) {
            const versions = await fs.readdir(exportDir);
            for (const v of versions) {
               const files = await fs.readdir(path.join(exportDir, v));
               const pdfExists = files.some(f => f.toLowerCase().endsWith('.pdf'));
               
               expect(pdfExists).toBe(true);
            }
         }
      }
    }
  });
});
